#!/usr/bin/env python3
"""Rebuild public/curriculo-kaue-alencar.pdf (one A4 page, ATS-friendly text).

    pip install reportlab && python3 scripts/build-resume.py

The PDF is deterministic (invariant timestamps), so a diff only appears when
the content below changes. Edit the CONTENT section, never the PDF.
"""
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, Frame, HRFlowable, KeepTogether, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

OUT = Path(__file__).resolve().parent.parent / 'public' / 'curriculo-kaue-alencar.pdf'

PURPLE, GOLD, INK, MUTED = '#5a4778', '#b89245', '#242126', '#6c6670'
NAME, PALE, GRID = '#372947', '#f3eff7', '#ddd7e3'
CREAM, CREAM_LINE = '#f7f1e4', '#d9c596'

SITE = 'https://kaue.pages.dev'


def style(name, **kw):
    base = dict(fontName='Helvetica', fontSize=8.05, leading=9.8, textColor=HexColor(INK))
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    'name': style('name', fontName='Times-Bold', fontSize=23.5, leading=26, textColor=HexColor(NAME)),
    'tag': style('tag', fontSize=9.9, leading=11.2),
    'contact': style('contact', fontSize=7.4, leading=9, textColor=HexColor(MUTED)),
    'h': style('h', fontName='Times-Bold', fontSize=10.4, leading=11.5, textColor=HexColor(PURPLE),
               spaceBefore=9, spaceAfter=1),
    'body': style('body'),
    'cell': style('cell', fontSize=7.05, leading=8.35),
    'proj': style('proj', fontName='Helvetica-Bold', spaceBefore=3),
    'projd': style('projd', fontSize=7.6, leading=9, leftIndent=10),
    'org': style('org', fontName='Helvetica-Bold'),
    'role': style('role', fontSize=7.5, leading=9, textColor=HexColor(MUTED)),
    'date': style('date', fontSize=7.5, leading=9, textColor=HexColor(MUTED), alignment=TA_RIGHT),
    'lang': style('lang', fontSize=7.6, leading=9.2),
}


def link(text, url):
    return f'<a href="{url}" color="{PURPLE}">{text}</a>'


def h(title):
    return [Paragraph(title, S['h']), HRFlowable(width='100%', thickness=.75, color=HexColor(GOLD), spaceAfter=4)]


def cell(title, text):
    return Paragraph(f'<font name="Helvetica-Bold" color="{PURPLE}">{title}</font><br/>{text}', S['cell'])


def project(title, year, desc, url=None):
    t = link(title, url) if url else title
    return KeepTogether([
        Paragraph(f'{t} <font name="Helvetica" color="{MUTED}">·</font> '
                  f'<font color="{GOLD}">{year}</font>', S['proj']),
        Paragraph(desc, S['projd']),
    ])


def job(org, role, date, note=None):
    left = [Paragraph(org, S['org']), Paragraph(role, S['role'])]
    if note:
        left.append(Paragraph(note, S['role']))
    t = Table([[left, Paragraph(date, S['date'])]], colWidths=[395, 100.4])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 2),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
    return t


def page(canvas, doc):
    canvas.saveState()
    canvas.setLineCap(1)
    canvas.setStrokeColor(HexColor(PURPLE)); canvas.setLineWidth(5.4)
    canvas.line(49.94, 792.2, 545.34, 792.2)
    canvas.setStrokeColor(HexColor(GOLD)); canvas.setLineWidth(1.1)
    canvas.line(49.94, 789.9, 545.34, 789.9)
    canvas.setLineCap(0)
    canvas.setStrokeColor(HexColor(GRID)); canvas.setLineWidth(.4)
    canvas.line(43.94, 29.1, 551.34, 29.1)
    canvas.setFillColor(HexColor(MUTED)); canvas.setFont('Helvetica', 6.35)
    canvas.drawString(43.94, 22.1, 'Currículo profissional · atualizado em outubro de 2026 · portfólio e documentação verificáveis')
    canvas.restoreState()


# ------------------------------------------------------------------ CONTENT
story = [
    Paragraph('Kauê Alencar', S['name']),
    Paragraph('Technical Writing · Arquitetura da Informação · Documentação de Processos', S['tag']),
    Paragraph('Três Lagoas, MS · ' + ' · '.join([
        link('kaue@tuta.com', 'mailto:kaue@tuta.com'),
        link('(47) 98910-5443', 'https://wa.me/5547989105443'),
        link('LinkedIn', 'https://www.linkedin.com/in/alencarkaue/'),
        link('Portfólio', SITE),
        link('GitHub', 'https://github.com/indiolibanes'),
    ]), S['contact']),
]

story += h('Perfil profissional')
story.append(Paragraph(
    'Atuação orientada a <b>documentação, arquitetura da informação e sistemas editoriais</b>, com base anterior em '
    'suporte, atendimento e rotinas administrativas. Estruturo conhecimento, requisitos e processos para torná-los '
    'encontráveis, reproduzíveis e auditáveis. Uso Git/GitHub, Markdown, Astro e Cloudflare Pages como meios de '
    'publicação; leio e reviso HTML/CSS/JS/Astro e diffs para validar implementação assistida por IA, sem me '
    'apresentar como desenvolvedor front-end independente.', S['body']))

story += h('Competências aplicadas')
comp = Table([
    [cell('Arquitetura & governança da informação', 'taxonomias · metadados · nomenclatura e URLs · ciclo de conteúdo · recuperação da informação'),
     cell('Documentação operacional', 'technical writing · runbooks · critérios de aceite · fluxos de manutenção/recuperação · rastreabilidade')],
    [cell('Pesquisa & síntese', 'curadoria · revisão editorial · tradução técnica · comparação de fontes · conteúdo multilíngue'),
     cell('Qualidade editorial & UX', 'acessibilidade orientada por WCAG · progressive enhancement · responsividade · consistência · crawlers/SEO')],
    [cell('Content ops & publicação', 'Obsidian · Readwise · Markdown · Git/GitHub · versionamento · Astro · Cloudflare Pages'),
     cell('Execução assistida por IA', 'decomposição de tarefas · requisitos/restrições · escolha de modelo · revisão de diffs · validação humana')],
], colWidths=[253.7, 253.7])
comp.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), HexColor(PALE)),
    ('BOX', (0, 0), (-1, -1), .45, HexColor(GRID)), ('INNERGRID', (0, 0), (-1, -1), .35, HexColor(GRID)),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(comp)

story += h('Método de trabalho')
method = Table([[Paragraph(
    '<b>Concepção, curadoria, requisitos e avaliação são conduzidos por mim.</b> Uso IA para prototipagem e '
    'implementação assistida com restrições explícitas, leitura de código, revisão de diffs e validação manual.',
    S['body'])]], colWidths=[507.4])
method.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), HexColor(CREAM)), ('BOX', (0, 0), (-1, -1), .55, HexColor(CREAM_LINE)),
    ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(method)

story += h('Projetos selecionados')
story += [
    project('Portfólio pessoal - sistema editorial e documentação', '2026',
            'Arquitetura de conteúdo; fluxo Obsidian -&gt; Git -&gt; Astro -&gt; Cloudflare Pages; auditorias de '
            'acessibilidade/UX; versionamento e recuperação; especificação e validação de implementação front-end '
            'assistida por IA.', SITE),
    project('Horologiarius - arquitetura da informação e publicação', '2026',
            'Ensaios, leituras, notas e orações organizados por função, assunto, estado editorial e metadados; '
            'taxonomia, navegação, URLs, SEO técnico e publicação multilíngue tratados como sistema editorial '
            'reutilizável.', 'https://horologiarius.com'),
    project('Assistente para pessoas com deficiência visual - documentação de protótipo (SENAI)', 'SENAI',
            'Agente Xiaozhi em placa K10 para descrição de ambientes, leitura de documentos e identificação de '
            'objetos; protótipo funcional com diretrizes documentadas de interação, acessibilidade e segurança.'),
    project('Facilitando a Programação - relatório técnico e protótipo (SENAI)', 'SENAI · equipe',
            'Relatório de projeto de Prototipagem de Negócios Inovadores: ESP32-S3 com ESP-Claw, comandos em '
            'linguagem natural via Telegram e API do DeepSeek para criar automações sem programar.'),
    project('Astrophysics Application - estudo de caso de UX', '2020-2021',
            'Pesquisa exploratória, personas, sketches, wireframes, protótipo de alta fidelidade e gamificação em '
            'um projeto educativo.', 'https://www.behance.net/gallery/119235467/My-Debut-UX-Project'),
]

story += h('Experiência - histórico resumido')
story += [
    job('Pão Nosso Alimentos - indústria de panificação', 'Assistente administrativo · Porto Velho/RO', 'jul. 2024 - nov. 2024'),
    job('Parthenon Serviços Terceirizados', 'Recepcionista terceirizado no CREA-MS · Três Lagoas/MS', '2023-2024 · 6 meses',
        'Saída voluntária para ingresso em Engenharia da Computação no IFMS, em período integral.'),
    job('Procuradoria da República em Rondônia', 'Estagiário - suporte de TI · Porto Velho/RO', 'fev. 2020 - fev. 2022'),
    job('Centro Universitário São Lucas', 'Estagiário - sistemas acadêmicos · Porto Velho/RO', 'fev. 2017 - jan. 2019'),
]

story += h('Formação &amp; trajetória acadêmica')
story += [
    Paragraph(f'<b>SENAI Três Lagoas</b> <font color="{MUTED}">·</font> Técnico em Automação Industrial - conclusão prevista: nov. 2026', S['body']),
    Paragraph(f'<b>Ensino superior federal - trajetória 2014-2024 (não concluída)</b> <font color="{MUTED}">·</font> '
              'Ciência da Computação, UNIR (2014-2022) -&gt; Sistemas de Informação, UFMS (2023) -&gt; Engenharia da '
              'Computação, IFMS (2024; última graduação cursada). <b>Atualmente não há graduação em andamento.</b>', S['body']),
    Paragraph(f'<b>Awari</b> <font color="{MUTED}">·</font> UX Design - formação intensiva concluída com méritos (2020-2021)', S['body']),
]

story += h('Idiomas')
lang = Table([
    [Paragraph(f'<b>{a}</b>', S['lang']) for a in ('Português', 'Espanhol', 'Inglês', 'Italiano')],
    [Paragraph(a, S['lang']) for a in ('nativo', 'instrumental', 'instrumental · leitura técnica', 'A2-B1 estimado · sem certificação')],
], colWidths=[126.85] * 4)
lang.setStyle(TableStyle([
    ('BOX', (0, 0), (-1, -1), .45, HexColor(GRID)), ('INNERGRID', (0, 0), (-1, -1), .35, HexColor(GRID)),
    ('LEFTPADDING', (0, 0), (-1, -1), 5), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(lang)

# ------------------------------------------------------------------- BUILD
doc = BaseDocTemplate(
    str(OUT), pagesize=A4, invariant=1,
    title='Kauê Alencar - Currículo', author='Kauê Alencar',
    subject='Technical Writing, arquitetura da informação, documentação e sistemas editoriais',
)
frame = Frame(43.94, 40, 507.4, 786 - 40, leftPadding=6, rightPadding=6, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cv', frames=[frame], onPage=page)])
doc.build(story)
pages = doc.page
assert pages == 1, f'resume must fit one page, got {pages}'
print(f'wrote {OUT} ({OUT.stat().st_size} bytes, {pages} page)')
