package repository

import (
"context"
"errors"
"time"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"gorm.io/gorm"
)

type UnitRepository interface {
Create(ctx context.Context, unit *model.Unit) error
GetByID(ctx context.Context, id uuid.UUID) (*model.Unit, error)
GetByProjectID(ctx context.Context, projectID uuid.UUID, filters map[string]interface{}, skip, limit int) ([]*model.Unit, int64, error)
Update(ctx context.Context, unit *model.Unit) error
Reserve(ctx context.Context, unitID, userID uuid.UUID) error
Sell(ctx context.Context, unitID, userID uuid.UUID) error
CancelReservation(ctx context.Context, unitID uuid.UUID) error
Delete(ctx context.Context, id uuid.UUID) error
}

type unitRepository struct {
db *gorm.DB
}

func NewUnitRepository(db *gorm.DB) UnitRepository {
return &unitRepository{db: db}
}

func (r *unitRepository) Create(ctx context.Context, unit *model.Unit) error {
return r.db.WithContext(ctx).Create(unit).Error
}

func (r *unitRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Unit, error) {
var unit model.Unit
err := r.db.WithContext(ctx).Preload("Project").First(&unit, "id = ?", id).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("unit not found")
}
return nil, err
}
return &unit, nil
}

func (r *unitRepository) GetByProjectID(ctx context.Context, projectID uuid.UUID, filters map[string]interface{}, skip, limit int) ([]*model.Unit, int64, error) {
var units []*model.Unit
var total int64

query := r.db.WithContext(ctx).Model(&model.Unit{}).Where("project_id = ?", projectID)

for key, value := range filters {
query = query.Where(key+" = ?", value)
}

if err := query.Count(&total).Error; err != nil {
return nil, 0, err
}

if err := query.Offset(skip).Limit(limit).Find(&units).Error; err != nil {
return nil, 0, err
}

return units, total, nil
}

func (r *unitRepository) Update(ctx context.Context, unit *model.Unit) error {
unit.UpdatedAt = time.Now()
return r.db.WithContext(ctx).Save(unit).Error
}

func (r *unitRepository) Reserve(ctx context.Context, unitID, userID uuid.UUID) error {
now := time.Now()
return r.db.WithContext(ctx).Model(&model.Unit{}).
Where("id = ? AND status = ?", unitID, "available").
Updates(map[string]interface{}{
"status":      "reserved",
"reserved_by": userID,
"reserved_at": now,
"updated_at":  now,
}).Error
}

func (r *unitRepository) Sell(ctx context.Context, unitID, userID uuid.UUID) error {
now := time.Now()
return r.db.WithContext(ctx).Model(&model.Unit{}).
Where("id = ? AND (status = ? OR status = ?)", unitID, "available", "reserved").
Updates(map[string]interface{}{
"status":     "sold",
"sold_to":    userID,
"sold_at":    now,
"updated_at": now,
}).Error
}

func (r *unitRepository) CancelReservation(ctx context.Context, unitID uuid.UUID) error {
return r.db.WithContext(ctx).Model(&model.Unit{}).
Where("id = ? AND status = ?", unitID, "reserved").
Updates(map[string]interface{}{
"status":      "available",
"reserved_by": nil,
"reserved_at": nil,
"updated_at":  time.Now(),
}).Error
}

func (r *unitRepository) Delete(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Delete(&model.Unit{}, "id = ?", id).Error
}
