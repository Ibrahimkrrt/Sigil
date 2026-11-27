"""Write a bundle of files. Input: blocks starting with a line '=== relative/path'."""
import sys, os
root = sys.argv[1]
cur, buf, n = None, [], 0
def flush():
    global n
    if cur is None: return
    p = os.path.join(root, cur); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf8').write('\n'.join(buf).strip('\n') + '\n'); n += 1
for line in sys.stdin.read().split('\n'):
    if line.startswith('=== '):
        flush(); cur, buf = line[4:].strip(), []
    else: buf.append(line)
flush(); print(n, 'files')
