// Glosario: qué es cada indicador, cómo se calcula y cómo leerlo.
// "formula" se muestra en un recuadro; cada línea es una fórmula o un paso.
export const G = {
  ipc: {
    titulo: "Inflación (IPC)",
    que: "El <b>Índice de Precios al Consumidor</b> mide cuánto cambia, en promedio, el precio de lo que compran los hogares: alimentos, alquiler, tarifas, transporte, ropa, salud, educación, etc. El INDEC releva miles de precios por mes en todo el país.",
    formula: [
      "IPC = Σ (peso del producto × precio de hoy / precio base) × 100",
      "Inflación mensual = (IPC del mes ÷ IPC del mes anterior − 1) × 100",
      "Interanual = (IPC del mes ÷ IPC del mismo mes del año pasado − 1) × 100",
      "Acumulada = (IPC del mes ÷ IPC de diciembre anterior − 1) × 100",
    ],
    lectura: "El <b>peso</b> de cada producto sale de cuánto gastan los hogares en él (Encuesta de Gastos de los Hogares): por eso un aumento en alimentos mueve más el índice que uno en, por ejemplo, joyería. Si el índice pasa de 100 a 102, la inflación del período es 2%.",
  },
  variaciones: {
    titulo: "Variación mensual e interanual",
    que: "Son dos formas de medir cuánto cambió un indicador. La <b>mensual</b> compara contra el mes anterior: sirve para ver el ritmo reciente. La <b>interanual</b> compara contra el mismo mes del año pasado: sirve para ver la tendencia sin que molesten las estacionalidades.",
    formula: [
      "Variación mensual = (valor del mes ÷ valor del mes anterior − 1) × 100",
      "Variación interanual = (valor del mes ÷ valor de hace 12 meses − 1) × 100",
      "Desestacionalizada: la misma cuenta, sobre la serie sin efectos de calendario",
    ],
    lectura: "Ejemplo: si un índice vale 110 este mes, 108 el mes pasado y 100 hace un año, la variación mensual es 1,9% y la interanual 10%. La <b>desestacionalizada</b> quita efectos repetidos todos los años (feriados, vacaciones, cosecha) para poder comparar un mes con el anterior.",
  },
  nucleo: {
    titulo: "Núcleo, regulados y estacionales",
    que: "El INDEC separa el IPC en tres grupos. <b>Estacionales</b>: productos con mucha variación por temporada (frutas, verduras, ropa, turismo). <b>Regulados</b>: precios fijados o muy influidos por el Estado (luz, gas, agua, combustibles, transporte, prepagas, cigarrillos, educación formal). <b>Núcleo</b>: todo lo demás; es la inflación “de fondo”.",
    formula: [
      "IPC general ≈ peso núcleo × núcleo + peso regulados × regulados + peso estacionales × estacionales",
      "Núcleo anualizada = ((1 + m₁) × (1 + m₂) × (1 + m₃))⁴ − 1",
      "(m₁, m₂, m₃ = inflación núcleo de los últimos 3 meses)",
    ],
    lectura: "Si la inflación baja pero la núcleo no, la baja puede deberse a tarifas congeladas o a precios estacionales, y no ser duradera. La <b>núcleo anualizada</b> dice cuánta inflación habría en un año si se mantuviera el ritmo de los últimos 3 meses.",
  },
  rubros: {
    titulo: "Inflación por rubro",
    que: "El IPC se divide en 12 grandes rubros (alimentos, vivienda y tarifas, transporte, salud, educación, etc.). Cada uno tiene su propio índice y su propio peso dentro del total.",
    formula: [
      "Variación del rubro = (índice del rubro hoy ÷ índice del período anterior − 1) × 100",
      "Aporte al total (incidencia) ≈ peso del rubro × variación del rubro",
    ],
    lectura: "Un rubro puede subir mucho y aportar poco si pesa poco en la canasta. Alimentos es el rubro de mayor peso, por eso es el que más mueve la inflación general.",
  },
  regiones: {
    titulo: "Inflación por región",
    que: "El IPC se calcula para 6 regiones: Gran Buenos Aires, Pampeana, Noreste, Noroeste, Cuyo y Patagonia. El total nacional es un promedio de las regiones según cuánto gasta cada una.",
    formula: ["IPC nacional = Σ (peso de la región × IPC de la región)"],
    lectura: "Las diferencias entre regiones suelen venir de las tarifas (cada provincia tiene las suyas) y del peso distinto de los alimentos en cada lugar.",
  },
  canastas: {
    titulo: "Canasta básica alimentaria y total",
    que: "La <b>CBA</b> (Canasta Básica Alimentaria) es el conjunto de alimentos que una persona necesita para cubrir sus necesidades mínimas de energía y nutrientes. La <b>CBT</b> (Canasta Básica Total) agrega otros bienes y servicios básicos: ropa, transporte, salud, educación, vivienda. Son las líneas que se usan para medir indigencia y pobreza.",
    formula: [
      "CBA = Σ (cantidad mínima de cada alimento × su precio del mes)",
      "CBT = CBA × inversa del coeficiente de Engel",
      "Inversa de Engel = gasto total ÷ gasto en alimentos (de hogares de referencia)",
      "Canasta del hogar = canasta por adulto equivalente × adultos equivalentes del hogar",
    ],
    lectura: "Se calcula para un <b>adulto equivalente</b> (varón de 30 a 60 años) y se ajusta según la edad y el sexo de cada integrante. Un hogar cuyo ingreso no llega a la CBT es <b>pobre</b>; si no llega a la CBA, es <b>indigente</b>. Si las canastas suben más que el IPC, la inflación golpea más a los hogares de menores ingresos.",
  },
  canastas_hogar: {
    titulo: "Canastas según el tipo de hogar",
    que: "Cada persona “cuenta” distinto según su edad y sexo, porque necesita distintas cantidades de alimentos. Eso se mide en <b>adultos equivalentes</b>: un varón de 30 a 60 años vale 1, y el resto se expresa en relación a él.",
    formula: [
      "Canasta del hogar = canasta por adulto equivalente × suma de adultos equivalentes",
      "Ejemplo familia tipo (4 integrantes) ≈ 3,09 adultos equivalentes",
    ],
    lectura: "Por eso un hogar de 4 personas no necesita 4 veces la canasta de un adulto, sino un poco más de 3 veces.",
  },
  dolar: {
    titulo: "Tipos de dólar y brecha",
    que: "<b>Oficial</b>: el precio del Banco Nación. <b>Mayorista</b>: el que usan bancos y empresas. <b>MEP</b> (Mercado Electrónico de Pagos) o dólar bolsa: se consigue comprando un bono en pesos y vendiéndolo en dólares, dentro del país. <b>CCL</b> (contado con liquidación): igual, pero los dólares quedan en una cuenta del exterior. <b>Blue</b>: el mercado informal.",
    formula: [
      "Dólar MEP = precio del bono en pesos ÷ precio del mismo bono en dólares",
      "Brecha = (cotización ÷ dólar oficial − 1) × 100",
    ],
    lectura: "Ejemplo: si el oficial está a $1.500 y el blue a $1.650, la brecha es 10%. Una brecha alta indica desconfianza o restricciones para comprar dólares. Este dato no es del INDEC: sale de dolarapi.com y argentinadatos.com.",
  },
  emae: {
    titulo: "Actividad económica (EMAE)",
    que: "El <b>Estimador Mensual de Actividad Económica</b> es un adelanto mensual del PBI: mide cuánto produce la economía en su conjunto, sumando 16 sectores (agro, industria, comercio, construcción, servicios, etc.). Mide <b>volumen</b> (cantidades), no precios.",
    formula: [
      "EMAE = Σ (peso del sector × volumen producido por el sector) — base 2004 = 100",
      "Variación mensual = (EMAE desest. del mes ÷ EMAE desest. del mes anterior − 1) × 100",
      "Distancia al máximo = (EMAE desest. actual ÷ máximo histórico − 1) × 100",
    ],
    lectura: "Un valor de 150 significa que la economía produce 50% más que en 2004. La <b>tendencia-ciclo</b> suaviza los saltos mes a mes y muestra la dirección de fondo. Dos trimestres seguidos de caída suelen considerarse una recesión técnica.",
  },
  emae_sectores: {
    titulo: "Actividad por sector",
    que: "El EMAE se abre en 16 sectores de la economía. Para cada uno, el INDEC publica cuánto produjo en volumen comparado con el mismo mes del año anterior.",
    formula: [
      "Variación interanual del sector = (índice del sector ÷ índice de hace 12 meses − 1) × 100",
      "Aporte al total ≈ peso del sector × variación del sector",
    ],
    lectura: "Sirve para ver qué motoriza o frena a la economía. Un sector grande (industria, comercio) que cae pesa más que un sector chico (pesca) que crece mucho.",
  },
  salarios: {
    titulo: "Índice de salarios",
    que: "Mide cómo evolucionan los sueldos en la economía: <b>privados registrados</b> (en blanco), <b>públicos</b> y <b>no registrados</b> (informales). Sigue el mismo puesto de trabajo en el tiempo, para que no influyan cambios de horas, premios o ausentismo.",
    formula: [
      "Índice = Σ (peso del sector × salario del puesto hoy ÷ salario del puesto en la base) × 100",
      "Variación mensual = (índice del mes ÷ índice del mes anterior − 1) × 100",
    ],
    lectura: "El dato es <b>nominal</b>: no descuenta la inflación. Para saber si el sueldo alcanza para más o para menos, hay que mirar el <b>salario real</b>. El sector no registrado se publica con 5 meses de rezago y es más volátil.",
  },
  salario_real: {
    titulo: "Salario real",
    que: "Muestra el <b>poder de compra</b> del sueldo: compara cuánto subieron los salarios con cuánto subieron los precios. Si es positivo, con el sueldo se compran más cosas que antes.",
    formula: [
      "Salario real = índice de salarios ÷ IPC × 100",
      "Variación real = (1 + aumento del salario) ÷ (1 + inflación) − 1",
    ],
    lectura: "Ejemplo: si en un año los salarios subieron 35% y la inflación fue 33%, el salario real subió (1,35 ÷ 1,33 − 1) = <b>+1,5%</b>. En el gráfico, un valor de 95 significa que el sueldo compra 5% menos que en noviembre de 2023 (el mes base).",
  },
  trabajo: {
    titulo: "Mercado de trabajo (EPH)",
    que: "Surge de la <b>Encuesta Permanente de Hogares</b>, que el INDEC hace cada trimestre en 31 aglomerados urbanos. Clasifica a la población según si trabaja, busca trabajo o no hace ninguna de las dos cosas.",
    formula: [
      "Población económicamente activa (PEA) = ocupados + desocupados",
      "Tasa de actividad = PEA ÷ población total × 100",
      "Tasa de empleo = ocupados ÷ población total × 100",
      "Tasa de desocupación = desocupados ÷ PEA × 100",
    ],
    lectura: "Una persona está <b>desocupada</b> si no trabajó y buscó activamente trabajo. Si deja de buscar, sale de la PEA: por eso la desocupación puede bajar sin que se creen empleos. Conviene mirarla junto con la tasa de empleo.",
  },
  desocupacion: {
    titulo: "Desocupación y subocupación",
    que: "<b>Desocupado</b>: no trabaja y busca trabajo. <b>Subocupado</b>: trabaja menos de 35 horas semanales y quiere trabajar más. Juntas muestran cuánta gente necesita más trabajo del que tiene.",
    formula: [
      "Desocupación = desocupados ÷ población económicamente activa × 100",
      "Subocupación = subocupados ÷ población económicamente activa × 100",
    ],
    lectura: "Ambas se calculan sobre la PEA (los que trabajan o buscan). Compará siempre con el mismo trimestre del año anterior: hay efectos estacionales (por ejemplo, el empleo de fin de año).",
  },
  actividad_empleo: {
    titulo: "Tasas de actividad y empleo",
    que: "La <b>tasa de actividad</b> mide qué parte de la población participa del mercado de trabajo (trabaja o busca). La <b>tasa de empleo</b> mide qué parte efectivamente trabaja.",
    formula: [
      "Actividad = (ocupados + desocupados) ÷ población total × 100",
      "Empleo = ocupados ÷ población total × 100",
      "Empleo formal + empleo informal = empleo total",
    ],
    lectura: "Si la tasa de empleo sube, hay más gente trabajando en proporción a la población. La informalidad indica qué parte de ese trabajo no está registrado (sin aportes ni cobertura).",
  },
  pobreza: {
    titulo: "Pobreza e indigencia",
    que: "Se mide comparando el <b>ingreso de cada hogar</b> (sueldos, jubilaciones, planes, etc.) con el costo de las canastas básicas para ese hogar. Surge de la Encuesta Permanente de Hogares y se publica por semestre.",
    formula: [
      "Hogar pobre: ingreso total familiar < Canasta Básica Total del hogar",
      "Hogar indigente: ingreso total familiar < Canasta Básica Alimentaria del hogar",
      "Tasa de pobreza (personas) = personas en hogares pobres ÷ total de personas × 100",
    ],
    lectura: "Es más alta medida en personas que en hogares, porque los hogares pobres suelen tener más integrantes. Depende de dos cosas: cuánto suben los ingresos y cuánto suben las canastas.",
  },
  comex: {
    titulo: "Comercio exterior",
    que: "Registra todos los bienes que la Argentina vende al mundo (<b>exportaciones</b>) y compra al mundo (<b>importaciones</b>), según los datos de Aduana. Se mide en dólares.",
    formula: [
      "Exportaciones: valor FOB (precio de la mercadería puesta en el puerto argentino)",
      "Importaciones: valor CIF (precio + flete + seguro hasta llegar al país)",
      "Variación interanual = (valor del mes ÷ valor del mismo mes del año anterior − 1) × 100",
    ],
    lectura: "Más exportaciones significan más dólares que entran al país. Las importaciones suelen crecer cuando la economía se reactiva (más insumos y maquinaria). Solo incluye bienes, no servicios como turismo.",
  },
  balanza: {
    titulo: "Balanza comercial",
    que: "Es la diferencia entre lo que el país vende y lo que compra al exterior en bienes. Muestra si entran o salen dólares por el comercio de mercaderías.",
    formula: [
      "Saldo comercial = exportaciones (FOB) − importaciones (CIF)",
      "Saldo > 0 → superávit · Saldo < 0 → déficit",
    ],
    lectura: "Ejemplo: si se exportaron US$ 8.000 M y se importaron US$ 6.500 M, el superávit es de US$ 1.500 M. Un superávit ayuda a acumular reservas. No es lo mismo que la <b>balanza de pagos</b>, que suma también servicios, intereses de deuda y movimientos financieros (el INDEC todavía no la publica en su API). Acá el total sale de sumar las aperturas de la API: puede diferir un poco del informe oficial.",
  },
  composicion: {
    titulo: "Qué vendemos y qué compramos",
    que: "Las exportaciones se agrupan en 4 grandes rubros: <b>productos primarios</b> (granos, carnes sin procesar, minerales), <b>MOA</b> (Manufacturas de Origen Agropecuario: harinas, aceites, carnes procesadas), <b>MOI</b> (Manufacturas de Origen Industrial: autos, químicos, metales) y <b>combustibles y energía</b>. Las importaciones se agrupan según su uso: bienes de capital, intermedios, combustibles, piezas, consumo y autos.",
    formula: ["Participación = valor del rubro ÷ total del mes × 100"],
    lectura: "Una economía que importa más bienes de capital e intermedios suele estar invirtiendo y produciendo más. El peso de combustibles en las exportaciones muestra el avance de la energía (Vaca Muerta).",
  },
  socios: {
    titulo: "Socios comerciales",
    que: "Los países a los que más vendemos (destinos) y de los que más compramos (orígenes), sumando los últimos 12 meses.",
    formula: ["Total por país = Σ de los últimos 12 meses de exportaciones (o importaciones) a ese país"],
    lectura: "Sumar 12 meses evita que un mes con un embarque grande distorsione el ranking. Brasil, China y Estados Unidos suelen ser los principales socios.",
  },
  mayoristas: {
    titulo: "Precios mayoristas (SIPM)",
    que: "Miden los precios a los que se venden los productos entre empresas, antes de llegar al consumidor. <b>IPIM</b>: precios internos al por mayor, de productos nacionales e importados. <b>IPIB</b>: lo mismo pero sin impuestos. <b>IPP</b>: precios básicos del productor, solo producción nacional (incluye lo que se exporta).",
    formula: [
      "Índice = Σ (peso del producto × precio de hoy ÷ precio base) × 100",
      "Variación mensual = (índice del mes ÷ índice del mes anterior − 1) × 100",
    ],
    lectura: "Son productos como granos, metales, químicos, combustibles o alimentos a granel. Cuando suben más que el IPC, suelen trasladarse a los precios al consumidor en los meses siguientes.",
  },
  mayoristas_vs_ipc: {
    titulo: "Mayoristas vs. consumidor",
    que: "Compara la inflación de los precios mayoristas (lo que pagan las empresas) con la del consumidor (lo que pagan los hogares).",
    formula: ["Diferencia = inflación mayorista (IPIM) − inflación minorista (IPC), en puntos porcentuales"],
    lectura: "Si los mayoristas suben más que el IPC, hay presión de costos que puede pasar a las góndolas. Si suben menos, los márgenes de los comercios se amplían o la inflación al consumidor tiende a moderarse.",
  },
  icc: {
    titulo: "Costo de la construcción (ICC)",
    que: "Mide cuánto cuesta construir una vivienda modelo en el Gran Buenos Aires. Se divide en tres capítulos: <b>materiales</b>, <b>mano de obra</b> y <b>gastos generales</b> (alquiler de equipos, servicios, etc.).",
    formula: [
      "ICC = Σ (peso del ítem × precio de hoy ÷ precio base) × 100",
      "Variación = (ICC del mes ÷ ICC del período anterior − 1) × 100",
    ],
    lectura: "Lo usan constructoras, desarrolladores y para actualizar contratos de obra. Si sube más que el IPC, construir se encarece en términos reales.",
  },
  obra_publica: {
    titulo: "Redeterminación de precios de obra pública",
    que: "Son los índices que se usan para actualizar los precios de los contratos de obra pública según el Decreto 1295/2002. Cada inciso (a, b, c…) representa un insumo: mano de obra, cemento, acero, asfalto, equipos, etc.",
    formula: [
      "Factor de redeterminación = Σ (peso del insumo × índice del insumo hoy ÷ índice al inicio del contrato)",
      "Precio actualizado = precio original × factor de redeterminación",
    ],
    lectura: "Los pesos de cada insumo los define cada contrato. Es una herramienta técnica para empresas constructoras y organismos públicos.",
  },
  ipi_manuf: {
    titulo: "Producción industrial (IPI manufacturero)",
    que: "El <b>Índice de Producción Industrial</b> mide cuánto producen las fábricas (en cantidades, no en pesos): alimentos, autos, acero, químicos, textiles, etc. Es uno de los primeros datos del mes sobre cómo viene la actividad.",
    formula: [
      "IPI = Σ (peso de la rama × producción de la rama hoy ÷ producción en la base) × 100",
      "Variación interanual = (IPI del mes ÷ IPI de hace 12 meses − 1) × 100",
    ],
    lectura: "Base 2004 = 100: un valor de 115 significa que la industria produce 15% más que en 2004. El <b>acumulado del año</b> compara la producción desde enero contra el mismo período del año anterior.",
  },
  ipi_minero: {
    titulo: "Producción minera (IPI minero)",
    que: "Mide cuánto se produce de petróleo, gas, minerales metalíferos (oro, plata, cobre, litio) y rocas para la construcción, en cantidades físicas.",
    formula: ["IPI minero = Σ (peso del producto × producción de hoy ÷ producción en la base) × 100 — base 2016 = 100"],
    lectura: "El petróleo y el gas son la mayor parte del índice: por eso su evolución sigue mucho a Vaca Muerta. Un valor de 140 significa 40% más producción que en 2016.",
  },
  petroleo: {
    titulo: "Petróleo y gas: convencional y no convencional",
    que: "El <b>convencional</b> se extrae de yacimientos tradicionales. El <b>no convencional</b> se extrae de rocas de baja permeabilidad mediante fractura hidráulica (fracking), principalmente en Vaca Muerta (Neuquén).",
    formula: [
      "Producción total = convencional + no convencional",
      "Participación no convencional = no convencional ÷ total × 100",
    ],
    lectura: "El petróleo se mide en miles de metros cúbicos por mes y el gas en millones de m³. La producción no convencional crece mientras la convencional cae lentamente por el agotamiento de los yacimientos maduros.",
  },
  litio: {
    titulo: "Carbonato de litio",
    que: "Es el producto que se obtiene del litio de los salares del Noroeste (Catamarca, Jujuy, Salta) y que se usa principalmente para fabricar baterías.",
    formula: ["Producción mensual en toneladas de carbonato de litio"],
    lectura: "Su crecimiento depende de la entrada en producción de nuevos proyectos y del precio internacional del litio.",
  },
  crianza: {
    titulo: "Canasta de crianza",
    que: "Estima cuánto cuesta por mes criar a un chico según su edad. Suma dos cosas: los <b>bienes y servicios</b> que necesita y el <b>tiempo de cuidado</b> que requiere.",
    formula: [
      "Canasta de crianza = bienes y servicios + tiempo de cuidado",
      "Bienes y servicios = canasta básica total ajustada a la edad del chico",
      "Tiempo de cuidado = horas de cuidado necesarias × salario horario de una trabajadora de casas particulares",
    ],
    lectura: "Se usa como referencia, por ejemplo, para fijar cuotas alimentarias. El tiempo de cuidado pesa más en los más chicos porque requieren más horas de atención.",
  },
  poblacion: {
    titulo: "Población y proyecciones",
    que: "Cuántos habitantes tiene y va a tener el país, por provincia, departamento, sexo y edad. Parte del <b>Censo 2022</b> y se proyecta hacia adelante.",
    formula: [
      "Población del año siguiente = población actual + nacimientos − defunciones + inmigrantes − emigrantes",
      "Crecimiento anual = (población del año ÷ población del año anterior − 1) × 100",
    ],
    lectura: "Son estimaciones al 1.º de julio de cada año. El crecimiento es cada vez menor porque nacen menos chicos que antes.",
  },
  piramide: {
    titulo: "Pirámide de población",
    que: "Muestra cuántas personas hay en cada grupo de edad, separadas en varones (a la izquierda) y mujeres (a la derecha).",
    formula: ["Cada barra = población de ese sexo en ese grupo de 5 años de edad"],
    lectura: "Una base ancha indica muchos nacimientos; una base angosta y una parte media o alta más ancha indica una población que envejece. Comparar el año actual con 2040 muestra hacia dónde va el país.",
  },
  caba_ipc: {
    titulo: "Inflación de la Ciudad (IPCBA)",
    que: "El <b>Índice de Precios al Consumidor de la Ciudad de Buenos Aires</b> lo elabora el Instituto de Estadística de la Ciudad (IDECBA), no el INDEC. Mide los precios de lo que consumen los hogares porteños, con una canasta propia en la que los <b>servicios</b> (alquiler, expensas, salud, educación, transporte) pesan más que en el IPC nacional.",
    formula: [
      "IPCBA = Σ (peso del producto × precio de hoy ÷ precio base) × 100 — base 2021 = 100",
      "Variación mensual = (IPCBA del mes ÷ IPCBA del mes anterior − 1) × 100",
      "Interanual = (IPCBA del mes ÷ IPCBA de hace 12 meses − 1) × 100",
    ],
    lectura: "Se publica unos días <b>antes</b> que el IPC del INDEC, así que sirve de anticipo. No tiene por qué coincidir: la canasta porteña es distinta (más servicios, menos alimentos). <b>Resto IPCBA</b> es el equivalente a la inflación núcleo: todo menos estacionales y regulados.",
  },
  caba_incidencia: {
    titulo: "Incidencia por rubro",
    que: "La <b>incidencia</b> dice cuántos puntos de la inflación del mes aportó cada rubro. Combina cuánto subió el rubro con cuánto pesa en la canasta.",
    formula: [
      "Incidencia del rubro ≈ peso del rubro × variación del rubro",
      "Σ incidencias de todos los rubros = inflación del mes",
    ],
    lectura: "Ejemplo: si la inflación fue 2% y Vivienda tiene incidencia 0,5, Vivienda explica medio punto de esos 2 (un cuarto de la inflación del mes). Un rubro puede subir mucho y aportar poco si pesa poco.",
  },
  caba_lineas: {
    titulo: "Líneas de pobreza e indigencia de la Ciudad",
    que: "Son el ingreso mensual que necesita cada tipo de hogar porteño para no ser pobre (<b>línea de pobreza</b>, equivalente a la CBT) o indigente (<b>línea de indigencia</b>, equivalente a la CBA). Las calcula el IDECBA con precios de la Ciudad.",
    formula: [
      "Línea de indigencia = canasta alimentaria del hogar, valorizada con el IPCBA",
      "Línea de pobreza = línea de indigencia + bienes y servicios no alimentarios del hogar",
      "Hogar pobre: ingreso total del hogar < línea de pobreza",
    ],
    lectura: "Son más altas que las del INDEC para el Gran Buenos Aires porque la Ciudad usa su propia canasta, con más peso de servicios. Tener la vivienda en propiedad o alquilarla cambia mucho la línea de pobreza (compará los hogares 4 y 5).",
  },
  alquileres: {
    titulo: "Alquileres en la Ciudad",
    que: "Es el precio promedio mensual al que se <b>publican</b> departamentos en alquiler (usados y a estrenar) en la Ciudad, según los avisos de portales inmobiliarios. Lo releva el IDECBA.",
    formula: [
      "Precio por m² = Σ precio total publicado ÷ Σ superficie publicada",
      "Precio de referencia = precio por m² × superficie tipo (30 m² 1 amb. · 43 m² 2 amb. · 70 m² 3 amb.)",
      "Variación real ≈ (1 + suba del alquiler) ÷ (1 + inflación) − 1",
    ],
    lectura: "Es el precio de <b>oferta</b> (lo que se pide en el aviso), no el precio final pactado, y no incluye expensas. Los últimos meses son provisorios. Si sube más que la inflación, alquilar se encarece en términos reales.",
  },
};
