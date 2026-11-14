export const formatINR = (paise: number = 0): string => {
  const rs = paise / 100;
  return Number.isInteger(rs) ? `₹${rs}` : `₹${rs.toFixed(2)}`;
};
