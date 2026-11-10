import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgForm } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HomeAdmin, HomeSlidePayload, ProductMedia } from '../../../../shared/commerce';
import { DEFAULT_HOME } from '../../../../shared/home-hero';
import { prepareHomeCover } from './home-cover-upload';
import { StorefrontHomeEditor } from './storefront-home';

const api = '/api/v1/admin/storefront/home';

function media(id: string, width: number, height: number): ProductMedia {
  const url = 'https://media.example/' + id + '.webp';
  return {
    id,
    alt_text: 'Portada de prueba',
    is_primary: false,
    urls: { original: url, large: url, medium: url, thumbnail: url },
    objects: [{ variant: 'original', width, height }],
  };
}

function cover(id: string, mobile = true): HomeSlidePayload {
  return {
    content: { ...DEFAULT_HOME, heroAssetId: id, mobileAssetId: mobile ? id + '-mobile' : null, enabled: true },
    heroMedia: media(id, 2160, 720),
    mobileMedia: mobile ? media(id + '-mobile', 1024, 1280) : null,
  };
}

function homeState(version: number, publishedSlides: HomeSlidePayload[]): HomeAdmin {
  return {
    version,
    draft: null,
    published: { ...DEFAULT_HOME, slides: publishedSlides.map(item => item.content) },
    publishedSlides,
  };
}

function mockForm(dirty = false): NgForm {
  return { dirty, form: { markAsPristine: vi.fn() } } as unknown as NgForm;
}

async function setup(home: HomeAdmin) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const editor = TestBed.runInInjectionContext(() => new StorefrontHomeEditor());
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(api).flush(home);
  http.expectOne('/api/v1/admin/categories').flush([]);
  http.expectOne('/api/v1/admin/collections').flush([]);
  http.expectOne('/api/v1/admin/ai-studio/status').flush({ enabled: false });
  await Promise.resolve();
  return { editor, http };
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Portadas del slider', () => {
  it('requiere ambas imágenes para publicar y permite preparar el borrador', async () => {
    const { editor, http } = await setup(homeState(3, [cover('desktop', false)]));
    expect(editor.canPublish()).toBe(false);
    await editor.publish(mockForm());
    http.expectNone(api + '/publish');

    const updated = cover('desktop');
    editor.data.set(homeState(4, [updated]));
    editor.slides = [updated.content];
    expect(editor.canPublish()).toBe(true);
    http.verify();
  });

  it('quita una diapositiva del borrador sin retirar la versión publicada', async () => {
    const { editor, http } = await setup(homeState(3, [cover('first'), cover('second')]));
    editor.deleteSlide();
    expect(editor.changed()).toBe(true);
    expect(editor.slides.map(item => item.heroAssetId)).toEqual(['second']);
    expect(editor.data()?.publishedSlides).toHaveLength(2);
    expect(editor.canRemoveDraftSlide(editor.slides[0])).toBe(false);
    http.expectNone(request => request.method === 'DELETE');
    http.verify();
  });

  it('confirma y consulta la retirada sin permitir borrar la última portada', async () => {
    vi.useFakeTimers();
    const first = cover('first');
    const second = cover('second');
    const { editor, http } = await setup(homeState(3, [first, second]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await editor.removePublished(first, mockForm(true));
    expect(confirm).not.toHaveBeenCalled();
    http.expectNone(request => request.method === 'DELETE');

    editor.data.set({ ...homeState(3, [first, second]), draft: DEFAULT_HOME });
    await editor.removePublished(first, mockForm());
    expect(confirm).not.toHaveBeenCalled();
    http.expectNone(request => request.method === 'DELETE');
    editor.data.set(homeState(3, [first, second]));

    const removing = editor.removePublished(first, mockForm());
    const deletion = http.expectOne(api + '/slides/first?version=3');
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.headers.has('Idempotency-Key')).toBe(true);
    deletion.flush({ home: homeState(4, [second]), purge: { id: 'job', status: 'QUEUED', attempts: 0 } });
    await removing;
    expect(editor.data()?.publishedSlides).toEqual([second]);
    http.expectOne(api + '/purges/job').flush({ id: 'job', status: 'RUNNING', attempts: 1 });
    await vi.advanceTimersByTimeAsync(2500);
    http.expectOne(api + '/purges/job').flush({ id: 'job', status: 'SUCCEEDED', attempts: 1 });
    await Promise.resolve();
    expect(editor.purge()?.status).toBe('SUCCEEDED');
    expect(editor.canRemovePublished(second, mockForm())).toBe(false);
    http.verify();
  });

  it('normaliza el recorte elegido y sus variantes a medidas exactas', async () => {
    const bitmap = { width: 4000, height: 1000, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => {
      callback(new Blob(['encoded'], { type }));
    });
    const source = new File(['photo'], 'photo.jpg');
    const variants = await prepareHomeCover('DESKTOP', { file: source, frameX: 100, frameY: 50 });
    expect(variants.map(({ width, height }) => [width, height])).toEqual([[2160, 720], [1200, 400], [720, 240], [320, 107]]);
    expect(drawImage.mock.calls[0]).toEqual([bitmap, 1000, 0, 3000, 1000, 0, 0, 2160, 720]);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
