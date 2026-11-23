import english from '../data/portfolio-en.json';

export function normalizeCopy(text) {
  return text.trim().replace(/\s+/g, ' ').normalize('NFC');
}

const r2Models = {
  'canônico carregado': 'canonical model loaded',
  'outro GLB carregado': 'another GLB loaded',
  'ainda não carregado': 'not loaded yet',
};

const formats = [
  [/^(© \d{4} Kauê Alencar\.) Todos os direitos reservados\.$/u, ([, credit]) => `${credit} All rights reserved.`],
  [/^(\d{2}) \/ (.+)$/u, ([, number, title]) => {
    return Object.hasOwn(english, title) ? `${number} / ${english[title]}` : undefined;
  }],
  [/^Pedir outro fragmento sobre Sophia\. Atual: (\d+) de (\d+)$/u,
    ([, index, count]) => `Request another fragment about Sophia. Current: ${index} of ${count}`],
  [/^há (\d+) (min|h|d)$/u, ([, count, unit]) => `${count} ${unit} ago`],
  [/^(Agora tocando|Ouvido recentemente): (.+)$/u,
    ([, status, track]) => `${status === 'Agora tocando' ? 'Now playing' : 'Recently played'}: ${track}`],
  [/^Carregando Sophia astronauta e foguete… (\d+%)$/u,
    ([, progress]) => `Loading astronaut Sophia and her rocket… ${progress}`],
  [/^Modelo público indisponível \(HTTP (\d+)\)\.$/u, ([, status]) => `Public model unavailable (HTTP ${status}).`],
  [/^Fim da corrida\. (\d+) pontos\.$/u, ([, score]) => `Run finished. ${score} points.`],
  [/^O arquivo transbordou\. Sophia recolhe os fragmentos\. (\d+) pontos\.$/u,
    ([, score]) => `The archive overflowed. Sophia gathers the fragments. ${score} points.`],
  [/^(.+) Nível (\d+): o arquivo acelera\.$/u,
    ([, message, level]) => `${english[message] ?? message} Level ${level}: the archive speeds up.`],
  [/^Indisponível: (.+)$/u, ([, reason]) => `Unavailable: ${reason}`],
  [/^Modelo local carregado\. (.+)$/u, ([, version]) => `Local model loaded. ${version}`],
  [/^Disponíveis: (.+)\. Arquivos lidos localmente; QA visual pendente\.$/u,
    ([, clips]) => `Available: ${clips}. Files loaded locally. Visual QA is pending.`],
  [/^Idles disponíveis: (.+)\. Atuação facial experimental\.$/u,
    ([, clips]) => `Available idles: ${clips}. Experimental facial performance.`],
  [/^Contorno (.+) selecionado · confira a fidelidade dos sorrisos\.$/u,
    ([, profile]) => `${profile} contour selected · check smile fidelity.`],
  [/^S6 · (.+) · G7 NO_GO · ensaio privado, não certificado\.$/u,
    ([, phase]) => `S6 · ${phase} · G7 NO_GO · private rehearsal, certification pending.`],
  [/^(Ataques básicos|Movimentos avançados|Resonance Liberation · Bursts) · (\d+\/\d+) clipes$/u,
    ([, category, count]) => `${english[category] ?? category} · ${count} clips`],
  [/^— parcial; faltam (\d+) clipes$/u, ([, count]) => `— partial; ${count} clips missing`],
  [/^Manifesto R2 autenticado; objetos ainda precisam de download, hash SHA-256 e validação de clipes\. Modelo: (.+)\.$/u,
    ([, model]) => `R2 manifest authenticated. Objects still require download, SHA-256 verification and clip validation. Model: ${r2Models[model] ?? model}.`],
  [/^Serviço privado indisponível; verifique a implantação e tente novamente\. \(HTTP (\d+)\)\.$/u,
    ([, status]) => `Private service unavailable. Check the deployment and try again. (HTTP ${status}).`],
  [/^Preparando · (.+) · etapa (\d+)$/u, ([, phase, step]) => `Preparing · ${phase} · step ${step}`],
];

export function englishCopy(source) {
  const text = normalizeCopy(source);
  if (Object.hasOwn(english, text)) return english[text];

  for (const [pattern, format] of formats) {
    const match = text.match(pattern);
    if (match) return format(match) ?? source;
  }
  return source;
}
