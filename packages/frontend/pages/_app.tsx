import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useSessionRestore } from '@/lib/useSessionRestore'

export default function App({ Component, pageProps }: AppProps) {
  // Automatically restore user session from localStorage on app startup
  useSessionRestore()

  return (
    <>
      <Head>
        <meta httpEquiv="refresh" content="5" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
