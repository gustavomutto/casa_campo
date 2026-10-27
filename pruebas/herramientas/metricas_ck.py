"""Métricas orientadas a clases (Chidamber & Kemerer) para código Dart.

Calcula por clase: número de métodos (NOM), métodos ponderados por clase
(WMC = suma de la complejidad ciclomática de McCabe de cada método),
profundidad del árbol de herencia (DIT), acoplamiento entre clases (CBO,
contando clases del proyecto) y falta de cohesión LCOM* de
Henderson-Sellers (0 = muy cohesiva, 1 = sin cohesión).

Uso: python3 metricas_ck.py lib salida.json
"""
import json
import os
import re
import sys

# Profundidad de las clases del framework (desde Object).
DIT_EXTERNAS = {
    "Object": 0,
    "Exception": 0,
    "StatelessWidget": 3,   # Object > DiagnosticableTree > Widget > StatelessWidget
    "StatefulWidget": 3,
    "InheritedWidget": 4,   # ... > Widget > ProxyWidget > InheritedWidget
    "State": 1,
    "ChangeNotifier": 1,
}

PALABRAS_DECISION = [r"\bif\s*\(", r"\bfor\s*\(", r"\bwhile\s*\(", r"\bcase\b", r"\bcatch\b", r"\bon\s+\w+\s+catch\b"]


def limpiar(codigo):
    """Elimina comentarios y el contenido de las cadenas."""
    codigo = re.sub(r"/\*.*?\*/", "", codigo, flags=re.S)
    codigo = re.sub(r"//[^\n]*", "", codigo)
    codigo = re.sub(r"'''.*?'''", "''", codigo, flags=re.S)
    codigo = re.sub(r'"""(.*?)"""', '""', codigo, flags=re.S)
    codigo = re.sub(r"r?'(?:\\.|[^'\\\n])*'", "''", codigo)
    codigo = re.sub(r'r?"(?:\\.|[^"\\\n])*"', '""', codigo)
    return codigo


def bloque(codigo, inicio):
    """Devuelve el índice de la llave que cierra la abierta en `inicio`."""
    profundidad = 0
    for i in range(inicio, len(codigo)):
        if codigo[i] == "{":
            profundidad += 1
        elif codigo[i] == "}":
            profundidad -= 1
            if profundidad == 0:
                return i
    return len(codigo) - 1


def complejidad(cuerpo):
    cc = 1
    for patron in PALABRAS_DECISION:
        cc += len(re.findall(patron, cuerpo))
    cc -= len(re.findall(r"\bon\s+\w+\s+catch\b", cuerpo))  # evita contar dos veces
    cc += len(re.findall(r"\bon\s+\w+(?:<[^>]*>)?\s*\{", cuerpo))  # on Tipo { ... }
    cc += cuerpo.count("&&") + cuerpo.count("||")
    cc += len(re.findall(r"\s\?\s", cuerpo))  # operador ternario
    cc += len(re.findall(r"\)\s*=>", cuerpo)) if "switch" in cuerpo else 0
    return cc


def miembros(cuerpo):
    """Divide el cuerpo de una clase en declaraciones de primer nivel."""
    segmentos, actual, i, prof_par = [], "", 0, 0
    while i < len(cuerpo):
        c = cuerpo[i]
        if c in "([":
            prof_par += 1
        elif c in ")]":
            prof_par -= 1
        if c == "{" and prof_par == 0:
            previo = actual.rstrip()
            es_cuerpo = (
                previo.endswith(")")
                or re.search(r"\b(async\*?|sync\*)$", previo)
                or re.search(r"\bget\s+\w+$", previo)
                or re.search(r"^\s*[\w<>?, ]*\s+get\s+\w+$", previo)
            )
            fin = bloque(cuerpo, i)
            actual += cuerpo[i:fin + 1]
            i = fin + 1
            if es_cuerpo:
                segmentos.append(actual.strip())
                actual = ""
            continue
        actual += c
        if c == ";" and prof_par == 0:
            segmentos.append(actual.strip())
            actual = ""
        i += 1
    return [s for s in segmentos if s]


def analizar(raiz):
    clases = {}
    for carpeta, _, archivos in os.walk(raiz):
        for archivo in sorted(archivos):
            if not archivo.endswith(".dart"):
                continue
            ruta = os.path.join(carpeta, archivo)
            codigo = limpiar(open(ruta, encoding="utf-8").read())
            for m in re.finditer(
                r"^(?:abstract\s+|sealed\s+|final\s+|base\s+|interface\s+)*(class|enum|mixin)\s+(\w+)([^{]*)\{",
                codigo,
                re.M,
            ):
                nombre, cabecera = m.group(2), m.group(3)
                inicio = m.end() - 1
                fin = bloque(codigo, inicio)
                cuerpo = codigo[inicio + 1:fin]
                padre = re.search(r"\bextends\s+(\w+)", cabecera)
                implementa = re.findall(r"\b(?:implements|with)\s+([\w<>, ]+)", cabecera)
                clases[nombre] = {
                    "nombre": nombre,
                    "archivo": os.path.relpath(ruta, raiz),
                    "tipo": m.group(1),
                    "padre": padre.group(1) if padre else None,
                    "implementa": [x.strip() for g in implementa for x in re.split(r",", re.sub(r"<[^>]*>", "", g)) if x.strip()],
                    "cuerpo": cuerpo,
                    "cabecera": cabecera,
                }
    return clases


def metricas(clases):
    nombres = set(clases)
    resultado = []

    def dit(nombre, visitados=()):
        clase = clases.get(nombre)
        if clase is None:
            return DIT_EXTERNAS.get(nombre, 1)
        padre = clase["padre"]
        if not padre or nombre in visitados:
            return 1 if clase["tipo"] == "class" else 1
        return 1 + dit(padre, visitados + (nombre,))

    for nombre, clase in clases.items():
        segmentos = miembros(clase["cuerpo"])
        campos, metodos = [], []
        for s in segmentos:
            cabeza = s.split("{", 1)[0].split("=>", 1)[0]
            es_constructor = re.match(rf"^(?:const\s+|factory\s+)?{nombre}(\.\w+)?\s*\(", s.strip())
            if es_constructor:
                continue
            if "(" in cabeza or re.search(r"\bget\s+\w+", cabeza) or "=>" in s or re.search(r"\boperator\b", cabeza):
                pos_igual = cabeza.find("=")
                pos_par = cabeza.find("(")
                if pos_igual != -1 and (pos_par == -1 or pos_igual < pos_par) and "=>" not in s.split(";")[0][: max(pos_igual, 0) + 3] and not re.search(r"\bget\b|\boperator\b", cabeza):
                    campos.append(s)
                else:
                    metodos.append(s)
            else:
                campos.append(s)
        if clase["tipo"] == "enum":
            # Los valores del enum no son métodos ni campos.
            campos = [c for c in campos if re.search(r"\bfinal\b|\bvar\b|\bconst\b|\bstatic\b", c)]
        nombres_campos = []
        for c in campos:
            if re.search(r"\bstatic\b", c):
                continue
            for n in re.findall(r"(\w+)\s*(?:=|;|,)", c.split("=")[0] + ";"):
                if n not in {"final", "late", "var", "const"} and not n[0].isupper():
                    nombres_campos.append(n)
        nombres_campos = sorted(set(nombres_campos))
        cc_metodos = [complejidad(mt) for mt in metodos]
        wmc = sum(cc_metodos)
        acoplados = set()
        texto = clase["cabecera"] + clase["cuerpo"]
        for otro in nombres:
            if otro != nombre and re.search(rf"\b{otro}\b", texto):
                acoplados.add(otro)
        # LCOM* de Henderson-Sellers
        lcom = None
        m = len(metodos)
        a = len(nombres_campos)
        if m > 1 and a > 0:
            accesos = []
            for campo in nombres_campos:
                accesos.append(sum(1 for mt in metodos if re.search(rf"\b{re.escape(campo)}\b", mt)))
            promedio = sum(accesos) / a
            lcom = round((promedio - m) / (1 - m), 2)
            lcom = max(0.0, min(1.0, lcom))
        resultado.append({
            "clase": nombre,
            "archivo": clase["archivo"],
            "tipo": clase["tipo"],
            "padre": clase["padre"] or "Object",
            "atributos": a,
            "metodos": m,
            "wmc": wmc,
            "cc_max": max(cc_metodos) if cc_metodos else 0,
            "dit": dit(nombre),
            "cbo": len(acoplados),
            "acoplada_con": sorted(acoplados),
            "lcom_hs": lcom,
        })
    return sorted(resultado, key=lambda r: r["archivo"] + r["clase"])


if __name__ == "__main__":
    raiz = sys.argv[1]
    salida = sys.argv[2] if len(sys.argv) > 2 else "metricas_ck.json"
    datos = metricas(analizar(raiz))
    json.dump(datos, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"{'Clase':34} {'NOM':>4} {'WMC':>4} {'DIT':>4} {'CBO':>4} {'LCOM':>5}")
    for r in datos:
        lcom = "-" if r["lcom_hs"] is None else f"{r['lcom_hs']:.2f}"
        print(f"{r['clase']:34} {r['metodos']:>4} {r['wmc']:>4} {r['dit']:>4} {r['cbo']:>4} {lcom:>5}")
    print("Clases:", len(datos), " NOM total:", sum(r["metodos"] for r in datos), " WMC total:", sum(r["wmc"] for r in datos))
