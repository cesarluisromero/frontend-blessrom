#!/usr/bin/env python3
"""Interactive account setup. Password never appears in argv, files or output."""
import getpass, json, subprocess, sys
USERNAME = "blessrom-admin"
BASE = ["docker","exec","-i","mcp-facebook-identity-1","sh","-c",
 'export KC_CLI_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD"; exec /opt/keycloak/bin/kcadm.sh "$@" --no-config --server http://127.0.0.1:8080/auth --realm master --user bootstrap-admin',
 "sh"]
def kc(args, payload=None):
    result=subprocess.run(BASE+args,input=json.dumps(payload) if payload is not None else None,text=True,capture_output=True)
    if result.returncode:
        # Never include a credential payload in diagnostics.
        print("Keycloak rechazó la operación. Revisa usuario, rol y conexión.")
        sys.exit(1)
    return result.stdout
users=json.loads(kc(["get","users","-r","blessrom","-q","username="+USERNAME,"-q","exact=true","--fields","id,username"]))
if users:
    sys.exit("La cuenta blessrom-admin ya existe. No se modificó su contraseña ni sus permisos.")
password=getpass.getpass("Nueva contraseña de blessrom-admin (mínimo 14 caracteres): ")
confirm=getpass.getpass("Repetir contraseña: ")
if len(password)<14 or password!=confirm:
    sys.exit("Las contraseñas no coinciden o son demasiado cortas. No se creó la cuenta.")
kc(["create","users","-r","blessrom","-f","-"],{"username":USERNAME,"enabled":True,"firstName":"Administrador","lastName":"Blessrom","credentials":[{"type":"password","value":password,"temporary":False}]})
password=confirm=None
kc(["add-roles","-r","blessrom","--uusername",USERNAME,"--rolename","admin"])
print("Cuenta blessrom-admin creada con rol admin. Ingresa en https://admin.blessrom.com")
