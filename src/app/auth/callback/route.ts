// This route bridges server-redirect to a client-side handler so that
// BOTH PKCE (?code=xxx) and implicit (#access_token=xxx) invite flows work.
// Hash fragments are invisible to server code, so we use a tiny HTML shim
// that reads window.location before anything is lost.
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Autenticando…</title>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center;
           height: 100vh; font-family: sans-serif; background: #FAFAFA; }
    p { color: #878C91; font-size: 15px; }
  </style>
</head>
<body>
  <p>Autenticando…</p>
  <script>
    (function () {
      var qs   = new URLSearchParams(window.location.search);
      var hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      var code          = qs.get('code');
      var access_token  = hash.get('access_token');
      var refresh_token = hash.get('refresh_token');

      var dest = '/auth/confirm';

      if (code) {
        dest += '?code=' + encodeURIComponent(code);
      } else if (access_token && refresh_token) {
        dest += '?access_token=' + encodeURIComponent(access_token)
              + '&refresh_token=' + encodeURIComponent(refresh_token);
      } else {
        window.location.replace('/login?error=auth');
        return;
      }

      window.location.replace(dest);
    })();
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
