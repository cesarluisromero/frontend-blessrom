import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { HomeCoverRole, ProductMedia } from '../../../../shared/commerce';
import { HOME_COVER_SIZES, homeCoverCrop, isFixedHomeCover } from '../../../../shared/home-cover';

export interface HomeCoverSelection {
  file: File;
  frameX: number;
  frameY: number;
}

@Component({
  selector: 'app-home-cover-upload',
  imports: [FormsModule],
  template: `
    <section class="cover-upload">
      <h3>{{ coverRole === 'DESKTOP' ? 'Escritorio' : 'Celular' }}</h3>
      <p>{{ target.width }} × {{ target.height }} px · {{ coverRole === 'DESKTOP' ? '3:1' : '4:5' }}</p>
      @if (asset?.urls?.medium; as url) {
        <img class="current" [src]="url" [alt]="asset.alt_text || 'Portada actual'">
        @if (!fixed()) { <p class="invalid">La imagen anterior requiere reemplazo antes de publicar.</p> }
      }
      <label>
        {{ asset ? 'Seleccionar reemplazo' : 'Seleccionar imagen' }}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif"
          (change)="select($event)" [disabled]="disabled">
      </label>
      @if (error()) { <p class="invalid" role="alert">{{ error() }}</p> }
      @if (previewUrl(); as url) {
        <figure>
          <img [src]="url" [style.aspect-ratio]="target.width + ' / ' + target.height"
            [style.object-position]="frameX + '% ' + frameY + '%'" alt="Recorte propuesto">
          <figcaption>Vista previa del archivo que se subirá</figcaption>
        </figure>
        @if (cropHorizontal()) {
          <label>Encuadre horizontal
            <input type="range" min="0" max="100" [(ngModel)]="frameX"
              [ngModelOptions]="{standalone:true}" [disabled]="disabled">
          </label>
        }
        @if (cropVertical()) {
          <label>Encuadre vertical
            <input type="range" min="0" max="100" [(ngModel)]="frameY"
              [ngModelOptions]="{standalone:true}" [disabled]="disabled">
          </label>
        }
        <div class="cover-actions">
          <button type="button" (click)="submit()" [disabled]="disabled">Usar este encuadre</button>
          <button type="button" class="quiet" (click)="clear()" [disabled]="disabled">Cancelar</button>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .cover-upload { min-width: 0; padding: 14px; border: 1px solid #d6e0eb; border-radius: 9px; }
    h3 { font-size: 15px; margin: 0; }
    p, figcaption { color: #536174; font-size: 12px; }
    figure { margin: 14px 0; }
    img { display: block; width: 100%; border-radius: 6px; background: #edf1f5; }
    figure img { object-fit: cover; }
    .current { object-fit: contain; max-height: 170px; }
    label { display: block; margin-top: 14px; font-size: 13px; font-weight: 600; }
    input { display: block; max-width: 100%; margin-top: 6px; }
    input[type=range] { width: 100%; min-height: 44px; }
    .invalid { color: #862b22; }
    .cover-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .cover-actions button { padding: 8px 12px; min-height: 44px; }
    .quiet { background: white; color: #14243e; border: 1px solid #b9c4d0; }
  `],
})
export class HomeCoverUpload implements OnChanges, OnDestroy {
  @Input({ required: true }) coverRole!: HomeCoverRole;
  @Input() asset: ProductMedia | null = null;
  @Input() disabled = false;
  @Output() readonly coverSelected = new EventEmitter<HomeCoverSelection>();

  readonly previewUrl = signal<string | null>(null);
  readonly error = signal('');
  frameX = 50;
  frameY = 50;
  private file: File | null = null;
  private dimensions = { width: 0, height: 0 };
  private selection = 0;

  get target() { return HOME_COVER_SIZES[this.coverRole][0]; }
  fixed() { return isFixedHomeCover(this.asset, this.coverRole); }
  cropHorizontal() { return this.dimensions.width * this.target.height > this.dimensions.height * this.target.width; }
  cropVertical() { return this.dimensions.width * this.target.height < this.dimensions.height * this.target.width; }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['asset'] && changes['asset'].previousValue?.id !== this.asset?.id) this.clear();
  }

  ngOnDestroy() { this.clear(); }

  clear() {
    this.selection++;
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
    this.file = null;
    this.error.set('');
  }

  async select(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled) return;
    this.clear();
    const selection = this.selection;
    if (file.size > 20 * 1024 * 1024) {
      this.error.set('La fotografía debe pesar como máximo 20 MB.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = bitmap;
      bitmap.close();
      if (selection !== this.selection) return;
      if (width < this.target.width || height < this.target.height) {
        this.error.set(`La imagen mide ${width} × ${height} px. Necesitas al menos ${this.target.width} × ${this.target.height} px.`);
        return;
      }
      this.file = file;
      this.dimensions = { width, height };
      this.frameX = this.frameY = 50;
      this.previewUrl.set(URL.createObjectURL(file));
    } catch {
      if (selection === this.selection) this.error.set('No se pudo abrir la imagen. Usa JPG, PNG, WebP o AVIF.');
    }
  }

  submit() {
    if (this.file && !this.disabled) this.coverSelected.emit({ file: this.file, frameX: this.frameX, frameY: this.frameY });
  }
}

export async function prepareHomeCover(role: HomeCoverRole, selection: HomeCoverSelection) {
  const [target, ...derivatives] = HOME_COVER_SIZES[role];
  const bitmap = await createImageBitmap(selection.file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext('2d', { alpha: false });
  try {
    if (!context) throw new Error('El navegador no pudo preparar la fotografía.');
    if (bitmap.width < target.width || bitmap.height < target.height) {
      throw new Error(`La fotografía debe tener al menos ${target.width} × ${target.height} px.`);
    }
    const crop = homeCoverCrop(bitmap, target, selection.frameX, selection.frameY);
    context.fillStyle = '#14243e';
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, target.width, target.height);
  } finally {
    bitmap.close();
  }
  const original = await encode(canvas, target.quality);
  const variants = [{ ...target, blob: original }];
  for (const spec of derivatives) {
    const resized = document.createElement('canvas');
    resized.width = spec.width;
    resized.height = spec.height;
    const resizeContext = resized.getContext('2d', { alpha: false });
    if (!resizeContext) throw new Error('El navegador no pudo preparar las versiones de la fotografía.');
    resizeContext.drawImage(canvas, 0, 0, spec.width, spec.height);
    variants.push({ ...spec, blob: await encode(resized, spec.quality) });
  }
  return variants;
}

function encode(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob?.type === 'image/webp') resolve(blob);
    else reject(new Error('El navegador no pudo crear la imagen WebP.'));
  }, 'image/webp', quality));
}
