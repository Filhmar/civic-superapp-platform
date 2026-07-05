/** "₱3,240.00" — prototype money format. */
export function formatPeso(amount: number): string {
  const fixed = amount.toFixed(2);
  const [whole, cents] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₱${grouped}.${cents}`;
}
