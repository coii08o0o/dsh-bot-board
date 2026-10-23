// Pure geometry for the running band's "N more below" hint.
//
// Kept out of panel.js so it can be exercised without a DOM: the panel measures
// real `getBoundingClientRect().top` values, and this function decides how many
// of them sit below the visible bottom edge. A cell that is partially visible is
// not counted — it is already on screen.
export function countBelow(tops, bottom, slop = 2) {
  if (!Number.isFinite(bottom)) return 0
  return tops.filter(top => Number.isFinite(top) && top >= bottom - slop).length
}
