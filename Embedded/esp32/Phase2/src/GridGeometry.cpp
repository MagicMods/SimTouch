#include "GridGeometry.h"

#include <math.h>

void GridGeometry::rebuild()
{
  uint16_t target = config_->targetCellCount;
  if (target < 1)
  {
    target = 1;
  }
  if (target > MAX_GRID_CELLS)
  {
    target = MAX_GRID_CELLS;
  }

  // Keep a full rectangular screen grid with total >= target.
  float sq = sqrtf((float)target);
  cols_ = (uint8_t)ceilf(sq);
  if (cols_ < 1)
  {
    cols_ = 1;
  }
  rows_ = (uint8_t)ceilf((float)target / (float)cols_);
  if (rows_ < 1)
  {
    rows_ = 1;
  }

  cellCount_ = (uint16_t)cols_ * (uint16_t)rows_;
  if (cellCount_ > MAX_GRID_CELLS)
  {
    cellCount_ = MAX_GRID_CELLS;
  }

  // Match sampling to render layout by including normalized gap spacing.
  const float gapNorm = (float)config_->gridGap / 240.0f;
  const float usableW = 1.0f - gapNorm * (float)(cols_ - 1);
  const float usableH = 1.0f - gapNorm * (float)(rows_ - 1);
  const float cellW = (usableW > 0.0f) ? (usableW / (float)cols_) : (1.0f / (float)cols_);
  const float cellH = (usableH > 0.0f) ? (usableH / (float)rows_) : (1.0f / (float)rows_);
  const float stepX = cellW + gapNorm;
  const float stepY = cellH + gapNorm;

  uint16_t idx = 0;
  for (uint8_t r = 0; r < rows_ && idx < cellCount_; ++r)
  {
    for (uint8_t c = 0; c < cols_ && idx < cellCount_; ++c)
    {
      float x = (c + 0.5f) * stepX;
      float y = (r + 0.5f) * stepY;
      if (x > 1.0f)
        x = 1.0f;
      if (y > 1.0f)
        y = 1.0f;
      cells_[idx].x = x;
      cells_[idx].y = y;
      ++idx;
    }
  }
}
