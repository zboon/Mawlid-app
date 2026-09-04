/* Der Typ liegt neben der Komponente statt in ihr: ein <script setup> darf
   keine Exporte enthalten, auch keine reinen Typexporte. */
export interface Tab {
  slug: string
  latin: string
  arabic: string
}
