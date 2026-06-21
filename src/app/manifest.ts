import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MySuper.gr | Σύγκριση Τιμών Σούπερ Μάρκετ',
    short_name: 'MySuper.gr',
    description: 'Βρείτε τις καλύτερες τιμές στα ελληνικά σούπερ μάρκετ. Υπολογίστε το φθηνότερο καλάθι αγορών ή βελτιστοποιήστε τις αγορές σας σε πολλά καταστήματα.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
    shortcuts: [
      {
        name: 'Σάρωση Barcode',
        short_name: 'Σάρωση',
        url: '/?action=scan',
        description: 'Ανοίξτε απευθείας την κάμερα για σάρωση barcode προϊόντος',
        icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Οδηγός Χρήσης',
        short_name: 'Οδηγός',
        url: '/guide',
        description: 'Μάθετε πώς να χρησιμοποιείτε την εφαρμογή',
        icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    launch_handler: {
      client_mode: 'focus-existing'
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
