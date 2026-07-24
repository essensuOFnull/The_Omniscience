export function parseCSSLength(value, referenceElement = document.documentElement) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  if (!isNaN(Number(trimmed))) return Number(trimmed);
  const match = trimmed.match(/^([-+]?[\d.]+)(.*)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].trim();
  if (unit === '') return num;
  if (unit === 'px') return num;
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.width = `1${unit}`;
  temp.style.height = '0';
  temp.style.overflow = 'hidden';
  temp.style.pointerEvents = 'none';
  referenceElement.appendChild(temp);
  const pxPerUnit = temp.getBoundingClientRect().width;
  referenceElement.removeChild(temp);
  return num * pxPerUnit;
}