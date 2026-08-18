/**
 * Elimina marcadores de Markdown (negritas, cursivas, tachado, código, links)
 * conservando el texto interno, para mostrarlo en planos sin asteriscos.
 */
export function stripMarkdown(text: string): string {
  let t = text;
  // bloques de código: conservar el contenido, quitar los delimitadores
  t = t.replace(/```[\s\S]*?\n([\s\S]*?)\n```/g, "$1");
  // spans de código inline
  t = t.replace(/`{1,3}([^`]+)`{1,3}/g, "$1");
  // imágenes ![alt](url) -> alt ; links [text](url) -> text
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // negrita + cursiva ***...*** o ___...___
  t = t.replace(/(\*{3}|_{3})([\s\S]*?)\1/g, "$2");
  // negrita **...** o __...__
  t = t.replace(/(\*{2}|_{2})([\s\S]*?)\1/g, "$2");
  // cursiva *...* o _..._
  t = t.replace(/(\*|_)([^*_\n][^*_\n]*?)\1/g, "$2");
  // tachado ~~...~~
  t = t.replace(/~~([^~]+)~~/g, "$1");
  // citas
  t = t.replace(/^\s*>\s?/gm, "");
  // encabezados markdown (### ...)
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  // marcadores sueltos que hayan quedado sin cerrar
  t = t.replace(/[*_]{1,3}/g, "");
  return t.trim();
}