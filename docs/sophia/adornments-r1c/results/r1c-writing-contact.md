# Caderno e pena — recuperados, contatos não aprovados

O piloto privado fd278e20… foi recuperado dos bytes da R1.B e confirmado por SHA-256. A reprodução pelo builder original também passa. O derivado R1.C preserva exatamente Book/Pen, seus materiais, UVs, índices, transformações, sockets e todos os canais de animação. A empunhadura não foi substituída por um gesto diferente.

| Aspecto | Resultado | Limite |
|---|---|---|
| Book/Pen recuperados | PASS técnico | Preservação não aprova naturalidade |
| Pena × página | Centro da tampa terminal a 0,6665–0,7270 mm da superfície em Write; igual antes/depois | É um proxy geométrico unsigned, não prova da verdadeira ponta tocando papel |
| Empunhadura | FAIL visual / diagnóstico | A luva/mão em forma de mitene oculta grande parte da pena; não há dedos articulados convincentes disponíveis |
| Mão no caderno | Não aprovada | Volume da mão sobre a página e cruzamentos ainda presentes |
| Manga/punho | FAIL/PARTIAL | Mesmos 12/61 cruzamentos de antebraço/manga; 60/61 punho/caderno |
| Queixo/gola | Melhora local medida | 12/61→0 e 65/100→0 nas amostras densas; não equivale a aprovação geral do Write |

Inspeção representativa: renders reais Write 1,6 s, vista da capa, vistas laterais/altas sobre a página e comparação da gola. No modelo completo, mãos/cabelo/roupa ocluem parte dos contatos. O PNG `props-only-diagnostic.png` revela a pena e as páginas reais com corpo/roupa ocultados, explicitamente **diagnóstico de objetos**, não prova de empunhadura ou folga corporal. O MP4 `Write_pen_book_contact.mp4` mantém toda a geometria visível e compara 24 frames, 8 fps, 3 segundos, nos mesmos tempos antes/depois; mostra o que permanece sem solução.

O ensaio de afastar o caderno 6 mm e compensar a pena preservou proximidade em Write, mas introduziu interseção pena/caderno em outra pose e piorou mão/caderno. Foi revertido. Isso não demonstra impossibilidade absoluta de reparo de prop/roupa; demonstra que não se deve entregar esse offset global como correção. Não houve alteração dos clipes Write/Idle/Point/Wave/Walk nem reconstrução de mãos para fabricar uma aprovação visual.

A contagem de mão/pena 61/61 inclui empunhadura potencialmente intencional e excesso de volume não aprovado. Cauda/corpo inclui encaixe anatômico potencial. Os relatórios mantêm essas classificações como indeterminadas; não transformam todos os cruzamentos em defeito nem em contato aceitável. Uma interseção amostrada não informa por si só profundidade, oclusão ou leitura artística.
