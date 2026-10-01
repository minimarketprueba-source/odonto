import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin para eliminar crossorigin de los tags en Electron
function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html.replace(/\s*crossorigin\s*/g, ' ');
    }
  };
}

// El mismo código se publica para varios consultorios, cada uno con su propia
// base (docs/INSTALAR-NUEVO-CONSULTORIO.md). Si en una copia nueva se olvidan
// las variables VITE_SUPABASE_*, `src/lib/supabase.ts` cae a la base de Mova
// Dent, que es su valor por omisión: el sitio nuevo se conectaría en silencio
// a la base de OTRO consultorio. Mejor que la publicación falle y lo diga.
const DOMINIO_MOVA_DENT = 'odonto-pied.vercel.app'

function exigirBasePropia(env: Record<string, string>) {
  if (env.VERCEL !== '1') return // solo en las publicaciones de Vercel
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) return
  if (env.VERCEL_PROJECT_PRODUCTION_URL === DOMINIO_MOVA_DENT) return
  throw new Error(
    '\n\nFALTA INDICAR LA BASE DE DATOS DE ESTE CONSULTORIO.\n' +
      'En Vercel: Settings → Environment Variables → agregar VITE_SUPABASE_URL y\n' +
      'VITE_SUPABASE_ANON_KEY con los datos de SU proyecto de Supabase, y volver a\n' +
      'publicar. Sin eso, este sitio usaría la base de Mova Dent.\n' +
      'Ver docs/INSTALAR-NUEVO-CONSULTORIO.md, paso 6.\n'
  )
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  exigirBasePropia({ ...env, ...process.env } as Record<string, string>)
  const devTunnelHost = env.DEV_TUNNEL_HOST ?? env.VITE_DEV_TUNNEL_HOST
  const useDevTunnel = Boolean(devTunnelHost)

  return {
    base: env.VITE_ELECTRON === 'true' ? './' : '/',
    plugins: [react(), removeCrossorigin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      watch: {
        ignored: ['**/public/**']
      },
      host: true,
      strictPort: true,
      port: Number(env.VITE_PORT ?? 5173),
      headers: {
        'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: blob: https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; frame-src 'self' https://*.supabase.co;",
      },
      ...(useDevTunnel
        ? {
            origin: `https://${devTunnelHost}`,
            hmr: {
              protocol: 'wss',
              host: devTunnelHost,
              clientPort: 443,
              timeout: 30000,
            },
          }
        : {}),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'charts-vendor': ['recharts'],
            'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            'mui-vendor': ['@mui/material', '@mui/x-charts', '@emotion/react', '@emotion/styled'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'query-vendor': ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000, 
      sourcemap: false,
      minify: 'terser',
      // Configuración para Electron - deshabilitar crossorigin
      cssCodeSplit: false,
      assetsInlineLimit: 0,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'recharts',
      ],
    },
  }
})
