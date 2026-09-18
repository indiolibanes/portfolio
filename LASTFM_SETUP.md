# Last.fm → Apple Music listening status

O portfólio usa o Last.fm apenas como ponte de leitura para os scrobbles enviados pelo Apple Music no Android.

## Cloudflare Pages

Crie estas variáveis no projeto Pages em **Settings → Variables and Secrets**:

- `LASTFM_USERNAME` — nome público da conta Last.fm.
- `LASTFM_API_KEY` — API key do Last.fm.

Não é necessário usar o shared secret do Last.fm, session key ou autenticação OAuth porque o portfólio usa somente o método público `user.getRecentTracks`.

Depois de salvar as variáveis, faça um novo deploy.

## Android

Use um scrobbler compatível com Apple Music, por exemplo Pano Scrobbler, e conecte-o à mesma conta Last.fm. O portfólio distingue:

- `nowplaying="true"` → “agora tocando”
- faixa histórica → “ouvido recentemente”

## Playlists do Apple Music

Links públicos de playlists podem ser adicionados manualmente em `src/config.ts`, na lista `MUSIC.publicPlaylists`.

Exemplo:

```ts
{
  name: 'Nome da playlist',
  url: 'https://music.apple.com/...',
  artwork: 'https://...',
  note: 'Apple Music',
}
```

`artwork` e `note` são opcionais.
