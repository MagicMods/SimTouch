#include "GridGeometry.h"

#include <math.h>

void GridGeometry::rebuild()
{
  cellCount_ = config_->targetCellCount;
  if (cellCount_ > MAX_GRID_CELLS)
  {
    cellCount_ = MAX_GRID_CELLS;
  }
  float sq = sqrtf((float)cellCount_);
  cols_ = (uint8_t)ceilf(sq);
  rows_ = (uint8_t)ceilf((float)cellCount_ / (float)cols_);

  const float stepX = 1.0f / (float)cols_;
  const float stepY = 1.0f / (float)rows_;
  uint16_t idx = 0;
  for (uint8_t r = 0; r < rows_ && idx < cellCount_; ++r)
  {
    for (uint8_t c = 0; c < cols_ && idx < cellCount_; ++c)
    {
      cells_[idx].x = (c + 0.5f) * stepX;
      cells_[idx].y = (r + 0.5f) * stepY;
      ++idx;
    }
  }
}
