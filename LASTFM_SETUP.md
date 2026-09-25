# Last.fm listening status

O portfólio usa o Last.fm como fonte neutra para a atividade musical recente. Qualquer player ou scrobbler conectado à mesma conta pode alimentar o widget — por exemplo, BitChord diretamente ou Apple Music por meio de um scrobbler compatível.

## Cloudflare Pages

Crie estas variáveis no projeto Pages em **Settings → Variables and Secrets**:

- `LASTFM_USERNAME` — nome público da conta Last.fm.
- `LASTFM_API_KEY` — API key do Last.fm.

Não é necessário usar o shared secret do Last.fm, session key ou autenticação OAuth porque o portfólio usa somente o método público `user.getRecentTracks`.

Depois de salvar as variáveis, faça um novo deploy.

## Players e scrobblers

Conecte ao mesmo perfil Last.fm todos os players que devem aparecer no widget.

Exemplos:

- BitChord → integração Last.fm nativa;
- Apple Music → scrobbler compatível no Android.

O portfólio não tenta inferir qual aplicativo originou cada scrobble. Ele apresenta apenas o estado consolidado do Last.fm:

- `nowplaying="true"` → “agora tocando”;
- faixa histórica → “ouvido recentemente”.

## Playlists do Apple Music

Links públicos de playlists podem continuar sendo adicionados manualmente em `src/config.ts`, na lista `MUSIC.publicPlaylists`.

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
