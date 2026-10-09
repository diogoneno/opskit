import { describe, expect, it } from 'vitest';
import { dockerRunToCompose, shellSplit } from './logic';

describe('shellSplit', () => {
  it('handles quotes, escapes and continuations', () => {
    expect(shellSplit(`a "b c" 'd "e"' f\\ g \\\n h ""`)).toEqual(['a', 'b c', 'd "e"', 'f g', 'h', '']);
    expect(() => shellSplit('a "b')).toThrow(/quote/);
  });
});

describe('docker run → compose', () => {
  it('converts a typical command', () => {
    const r = dockerRunToCompose(`docker run -d --name web -p 8080:80 -p 443:443 \\
      -e TZ=UTC -e "GREETING=hello world" -v pgdata:/var/lib/data -v ./conf:/etc/conf:ro \\
      --restart unless-stopped --network backend nginx:1.27 nginx -g 'daemon off;'`);
    expect(r.service).toBe('web');
    expect(r.yaml).toBe(`services:
  web:
    image: nginx:1.27
    container_name: web
    ports:
      - 8080:80
      - 443:443
    environment:
      TZ: UTC
      GREETING: hello world
    volumes:
      - pgdata:/var/lib/data
      - ./conf:/etc/conf:ro
    restart: unless-stopped
    networks:
      - backend
    command:
      - nginx
      - -g
      - daemon off;
volumes:
  pgdata:
networks:
  backend:
    external: true
`);
    expect(r.notes.join(' ')).toMatch(/-d dropped/);
  });
  it('handles combined short flags, = forms and booleans', () => {
    const r = dockerRunToCompose('sudo docker container run -it --rm --read-only --cpus=1.5 -m 512m -p8080:80 --gpus all alpine:3 sh');
    expect(r.service).toBe('alpine');
    expect(r.yaml).toContain('stdin_open: true\n    tty: true');
    expect(r.yaml).toContain('read_only: true');
    expect(r.yaml).toContain('cpus: 1.5');
    expect(r.yaml).toContain('mem_limit: 512m');
    expect(r.yaml).toContain('- 8080:80');
    expect(r.yaml).toContain('count: all');
  });
  it('maps --mount, host networking and healthchecks', () => {
    const r = dockerRunToCompose('docker run --mount type=volume,source=cache,target=/cache,readonly --net=host --health-cmd "curl -f http://app/health" --health-retries 3 redis');
    expect(r.yaml).toContain('type: volume\n        source: cache\n        target: /cache\n        read_only: true');
    expect(r.yaml).toContain('network_mode: host');
    expect(r.yaml).toContain('- CMD-SHELL\n        - curl -f http://app/health\n      retries: 3');
  });
  it('reports what it cannot convert', () => {
    expect(dockerRunToCompose('docker run --oom-score-adj 5 busybox').notes[0]).toMatch(/oom-score-adj/);
    expect(() => dockerRunToCompose('docker ps')).toThrow(/docker run/);
    expect(() => dockerRunToCompose('docker run -d')).toThrow(/image/);
    expect(() => dockerRunToCompose('docker run -Z x')).toThrow(/Unknown short flag/);
  });
});
