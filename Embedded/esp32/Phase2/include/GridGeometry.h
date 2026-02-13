#ifndef PHASE2_GRID_GEOMETRY_H
#define PHASE2_GRID_GEOMETRY_H

#include "SimConfig.h"

static constexpr uint16_t MAX_GRID_CELLS = 512;

struct GridCell
{
  float x;
  float y;
};

class GridGeometry
{
public:
  explicit GridGeometry(SimConfig *cfg) : config_(cfg) {}
  void rebuild();

  uint16_t getCellCount() const { return cellCount_; }
  uint8_t getCols() const { return cols_; }
  uint8_t getRows() const { return rows_; }
  const GridCell *getCells() const { return cells_; }

private:
  SimConfig *config_;
  GridCell cells_[MAX_GRID_CELLS];
  uint16_t cellCount_ = 0;
  uint8_t cols_ = 0;
  uint8_t rows_ = 0;
};

#endif
