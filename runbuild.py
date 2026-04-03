import subprocess, os, sys, shutil

proj     = r'C:\Users\Raul brendon\weekswap'
node_exe = r'C:\Program Files\nodejs\node.exe'
log      = r'C:\Users\Raul brendon\builddeploy.log'
vite_js  = proj + r'\node_modules\vite\bin\vite.js'
tsc_js   = proj + r'\node_modules\typescript\bin\tsc'
firebase = os.environ.get('APPDATA','') + r'\npm\node_modules\firebase-tools\lib\bin\firebase.js'

env = os.environ.copy()
env['PATH'] = r'C:\Program Files\nodejs' + ';' + env.get('PATH', '')

def run(label, args, **kw):
    print(f'>>> {label}')
    r = subprocess.run(args, env=env, capture_output=True, text=True, **kw)
    with open(log, 'a', encoding='utf-8') as f:
        f.write(f'\n=== {label} ===\n')
        f.write(r.stdout[-2000:])
        f.write(r.stderr[-2000:])
        f.write(f'Exit: {r.returncode}\n')
    if r.returncode != 0:
        print(f'ERRO:\n{r.stderr[-600:]}')
        sys.exit(1)
    print(f'OK')

with open(log, 'w', encoding='utf-8') as f:
    f.write('=== WeekSwap Build + Deploy ===\n')

run('vite build', [node_exe, vite_js, 'build'], cwd=proj)
run('tsc server', [node_exe, tsc_js, '-p', 'tsconfig.server.json'], cwd=proj)

os.makedirs(proj + r'\dist\.well-known', exist_ok=True)
shutil.copy(proj + r'\public\.well-known\assetlinks.json',
            proj + r'\dist\.well-known\assetlinks.json')
print('>>> assetlinks.json copiado')

run('firebase deploy', [node_exe, firebase, 'deploy', '--only', 'hosting'], cwd=proj)
print('TUDO_OK')
