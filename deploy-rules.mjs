import { readFileSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'weekswap-4c7d0';
const rules = readFileSync('./firestore.rules', 'utf8');

const auth = new GoogleAuth({
  credentials: {
    client_email: 'firebase-adminsdk-fbsvc@weekswap-4c7d0.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAw+rgDy9+EsQO\n9mP8NK+iUG7WqaPR7mwAfOAcz2n6EuAm+i+xq+1iNr6XvvgRsXO2BohL//go+7Hh\nuStxjLgVIBwrb3MLtqHrRrzHu1WD7HxhC49rVP+ot/XYOX8v5Jl9IRtJkh55/J8z\nsAavVLK5k6qs7mrjLHIs1WGs+W9BWqz+5UmkiQfeYN/GexgxeJn3h3TWgLpGsR3a\nmfIDYvDZaQW7/WePc+V1ZHW8RMugyQgxCr+flu6/sztg439RPlGAoqVKcm90QXqA\nZKbUhuyzRmQ3pxmuxLYbCYcMZethNIan525BigftFtkD/JDHtC4m8qaWKpor6d+p\nxx1tRRHtAgMBAAECggEABffK1McDlGamVURBkjRbX64X0GOOI9i61UUIdzvgrxJY\niDxkr56ACfNh8TbDXWDeETugiqHRIAuy1Sczdh+CL31AAgRATpOH7c3R2GkvW5c9\nvo9qEEugYqvXW6tkCaqNKfeVbbCtat9sWmBPxKvdoKs2tIXpH0FoA4VTsdRDIoXL\nXnicVP6oHsjg7vYtAsljQZpoR305+I8Jt3okRMTpuex3dtVA8/fHJBn+//T6giMG\n7cVP1yDYhVQb3OaLKt2Kh3MYInrHs1PALf4ZvO0j1m9os18Fo2YwxgTrj8NZL5xp\nwRuGaItVkLJIrm55qlMFQsLz8fyP5PrJjNRzSTgfzQKBgQDtKBzE33Kx2ihgAdEu\nENWerhn5mTRg4Z1eNm4aDbF7fLykqt76UC5YdgpZwgxAKPiONiTqoTBLUG4QgBgK\npDgNhQOMvI4Vw5o+ixHOEesuH1cbNdrWuVuDdXaSceoI2LSTf0PHYpyC+NrR2Kk1\np2a8ka2FG1yDwMfmJUiXoNRVqwKBgQDQFNyaxfjMLr2EtYJtOTCKHO6Rla4SxDVm\nwJPXFnmAnJ4SrVqCy1rcHyExjvqJTv5k72LKNrZsJmPtz3VF0KQuaK4ppBvXuIuJ\n9s1kbXVrG0jZX7Qpa0aa9p06amyf65gg5JkdVhC1BWmncRQBkgWULmoCcwtr5M0f\nCds+TTVuxwKBgQDa/p2CVuxsu41pCoSFS1pYC2FFEWpCxFQzOYP2Xwqzg34XeQoq\nj3wch/QK6puxa6QKfokcePhFs+HPLtoEiZyRL3EVttBl3JhEhNtONVG854fiQprw\niX2uKPvzQ2nf/WzSf0Sxi6gHcZFvEek++HRwUP2w2pFVwOFW7rrX+dXZvQKBgEgu\nVHBkKHA77oYwqLPW2N2wN5nNAHuGELg6KY69Pxy8N6Fm/TTN8hDVw5/7ZzFmc5zz\n5aMb46AUmSmPg7DaNXnb2j6brQTiAZW0RX+G8OpcpqKxLkAH9JAg6F2xOUkoYrdW\nVT718gm5fPMWqMf6rXC/wQpkehvNXNJdiu5LvjNVAoGAAzUAPwRJx2ub3Vol8+xk\nQx8Shd71ht6aPkrSCQMeQASqa2iaGm9AhfdxwNtyLb9qMox7FM62hMMLs1uI522S\ne3D4GFrWiInrwgiaHcwEsCJjJEo+7yY5wutL1bWp+RYaG6MVDsYdc4EWgp0TJop/\nh+W+4/WLHGDrusTqR93X8Wk=\n-----END PRIVATE KEY-----\n`,
  },
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function deployRules() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  // 1. Criar novo ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rules }] } }),
    }
  );
  const ruleset = await createRes.json();
  if (!createRes.ok) { console.error('Erro ruleset:', ruleset); process.exit(1); }
  console.log('Ruleset criado:', ruleset.name);

  // 2. Listar releases para achar o correto
  const listRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const list = await listRes.json();
  console.log('Releases:', JSON.stringify(list.releases?.map(r => r.name), null, 2));

  // 3. Atualizar o release do Firestore
  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`;
  const updateRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
    }
  );
  const text = await updateRes.text();
  console.log('Status:', updateRes.status);
  if (!updateRes.ok) { console.error('Erro release:', text); process.exit(1); }
  const updated = JSON.parse(text);
  console.log('Regras publicadas:', updated.name);
}

deployRules().catch(console.error);
