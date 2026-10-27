# Genera el diagrama de casos de uso (UML) como SVG.
W, H = 1200, 900
casos = [
 ("CU-01", "Iniciar sesión", 600, 90),
 ("CU-02", "Cerrar sesión", 600, 165),
 ("CU-03", "Gestionar clientes", 600, 240),
 ("CU-06", "Consultar disponibilidad", 600, 315),
 ("CU-05", "Registrar reserva", 600, 400),
 ("CU-09", "Consultar reservas", 600, 480),
 ("CU-07", "Registrar pago", 600, 555),
 ("CU-08", "Gestionar estado de la reserva", 600, 630),
 ("CU-04", "Gestionar casas", 600, 730),
 ("CU-10", "Generar reportes", 600, 810),
]
inc = [("CU-11", "Verificar disponibilidad", 960, 330), ("CU-12", "Calcular tarifa", 960, 450)]
pos = {c[0]: (c[2], c[3]) for c in casos + inc}
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="DejaVu Sans, Arial" font-size="15">',
     '<rect width="100%" height="100%" fill="white"/>',
     '<defs><marker id="f" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M0,0 L12,5 L0,10" fill="none" stroke="#333"/></marker>'
     '<marker id="g" markerWidth="16" markerHeight="14" refX="15" refY="7" orient="auto"><path d="M0,0 L16,7 L0,14 Z" fill="white" stroke="#333"/></marker></defs>',
     '<rect x="330" y="30" width="800" height="840" fill="#f7fbf7" stroke="#2e7d32" stroke-width="2" rx="6"/>',
     '<text x="730" y="58" text-anchor="middle" font-weight="bold" font-size="18">Sistema Casa Campo</text>']
def actor(x, y, nombre):
    return (f'<g stroke="#333" stroke-width="2" fill="none"><circle cx="{x}" cy="{y}" r="16"/>'
            f'<line x1="{x}" y1="{y+16}" x2="{x}" y2="{y+60}"/><line x1="{x-28}" y1="{y+32}" x2="{x+28}" y2="{y+32}"/>'
            f'<line x1="{x}" y1="{y+60}" x2="{x-22}" y2="{y+95}"/><line x1="{x}" y1="{y+60}" x2="{x+22}" y2="{y+95}"/></g>'
            f'<text x="{x}" y="{y+120}" text-anchor="middle" font-weight="bold">{nombre}</text>')
rec = (130, 230); adm = (130, 640)
def linea(a, b, extra=''):
    return f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#333" stroke-width="1.4" {extra}/>'
for cu in ["CU-01","CU-02","CU-03","CU-06","CU-05","CU-09","CU-07","CU-08"]:
    x, y = pos[cu]; s.append(linea((rec[0]+35, rec[1]+40), (x-150, y)))
for cu in ["CU-04","CU-10"]:
    x, y = pos[cu]; s.append(linea((adm[0]+35, adm[1]+40), (x-150, y)))
# generalización: Administrador hereda de Recepcionista
s.append(f'<line x1="{adm[0]}" y1="{adm[1]-22}" x2="{rec[0]}" y2="{rec[1]+128}" stroke="#333" stroke-width="1.6" marker-end="url(#g)"/>')
for cu, nom, x, y in casos + inc:
    s.append(f'<ellipse cx="{x}" cy="{y}" rx="150" ry="30" fill="#e8f5e9" stroke="#2e7d32" stroke-width="1.6"/>')
    s.append(f'<text x="{x}" y="{y-3}" text-anchor="middle" font-weight="bold" font-size="12">{cu}</text>')
    s.append(f'<text x="{x}" y="{y+15}" text-anchor="middle">{nom}</text>')
def rel(a, b, texto):
    (x1,y1),(x2,y2) = pos[a], pos[b]
    x1 += 150; x2 -= 140
    s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#333" stroke-dasharray="7,5" marker-end="url(#f)"/>')
    s.append(f'<text x="{(x1+x2)/2}" y="{(y1+y2)/2-8}" text-anchor="middle" font-size="13" font-style="italic">{texto}</text>')
rel("CU-05","CU-11","«include»"); rel("CU-05","CU-12","«include»")
rel("CU-06","CU-11","«include»")
# extend: registrar pago extiende gestionar estado? usamos extend de CU-07 hacia CU-09
x1,y1 = pos["CU-07"]; x2,y2 = pos["CU-09"]
s.append(f'<line x1="{x1+150}" y1="{y1-5}" x2="{x2+150}" y2="{y2+5}" stroke="#333" stroke-dasharray="7,5" marker-end="url(#f)"/>')
s.append(f'<text x="{x1+175}" y="{(y1+y2)/2+5}" font-size="13" font-style="italic">«extend»</text>')
s.append(actor(*rec, "Recepcionista").replace('>Recepcionista<','>Recepcionista<'))
s.append(actor(*adm, "Administrador"))
s.append('</svg>')
open("casos_uso.svg","w").write("\n".join(s))
