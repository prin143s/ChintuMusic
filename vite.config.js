import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chintu-music-import-fix',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('/src/main.jsx')) return null;
        let out = code;
        out = out.replace(
          "const files=[...e.target.files].filter(f=>f.type.startsWith('audio/'));",
          "const files=[...e.target.files].filter(f=>{const n=(f.name||'').toLowerCase();const ext=n.includes('.')?n.slice(n.lastIndexOf('.')):'';const audioExt=['.mp3','.m4a','.aac','.wav','.ogg','.oga','.opus','.flac','.webm','.aiff','.alac'].includes(ext);return f.type.startsWith('audio/')||audioExt;});"
        );
        out = out.replaceAll('accept=\"audio/*\"', 'accept=\"audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm\"');
        return { code: out, map: null };
      }
    }
  ],
  server: { port: 5173 }
});
