package repository

import (
"context"
"errors"
"time"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"gorm.io/gorm"
)

type SaleRepository interface {
Create(ctx context.Context, sale *model.Sale) error
GetByID(ctx context.Context, id uuid.UUID) (*model.Sale, error)
GetByUnitID(ctx context.Context, unitID uuid.UUID) (*model.Sale, error)
List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Sale, int64, error)
Update(ctx context.Context, sale *model.Sale) error
Approve(ctx context.Context, id uuid.UUID) error
Complete(ctx context.Context, id uuid.UUID) error
Cancel(ctx context.Context, id uuid.UUID) error
Delete(ctx context.Context, id uuid.UUID) error
}

type saleRepository struct {
db *gorm.DB
}

func NewSaleRepository(db *gorm.DB) SaleRepository {
return &saleRepository{db: db}
}

func (r *saleRepository) Create(ctx context.Context, sale *model.Sale) error {
return r.db.WithContext(ctx).Create(sale).Error
}

func (r *saleRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Sale, error) {
var sale model.Sale
err := r.db.WithContext(ctx).Preload("Unit").First(&sale, "id = ?", id).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("sale not found")
}
return nil, err
}
return &sale, nil
}

func (r *saleRepository) GetByUnitID(ctx context.Context, unitID uuid.UUID) (*model.Sale, error) {
var sale model.Sale
err := r.db.WithContext(ctx).Preload("Unit").First(&sale, "unit_id = ?", unitID).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("sale not found")
}
return nil, err
}
return &sale, nil
}

func (r *saleRepository) List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Sale, int64, error) {
var sales []*model.Sale
var total int64

query := r.db.WithContext(ctx).Model(&model.Sale{}).Preload("Unit")

for key, value := range filters {
query = query.Where(key+" = ?", value)
}

if err := query.Count(&total).Error; err != nil {
return nil, 0, err
}

if err := query.Offset(skip).Limit(limit).Order("created_at DESC").Find(&sales).Error; err != nil {
return nil, 0, err
}

return sales, total, nil
}

func (r *saleRepository) Update(ctx context.Context, sale *model.Sale) error {
sale.UpdatedAt = time.Now()
return r.db.WithContext(ctx).Save(sale).Error
}

func (r *saleRepository) Approve(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Model(&model.Sale{}).
Where("id = ?", id).
Updates(map[string]interface{}{
"status":     "approved",
"updated_at": time.Now(),
}).Error
}

func (r *saleRepository) Complete(ctx context.Context, id uuid.UUID) error {
now := time.Now()
return r.db.WithContext(ctx).Model(&model.Sale{}).
Where("id = ?", id).
Updates(map[string]interface{}{
"status":        "completed",
"handover_date": now,
"updated_at":    now,
}).Error
}

func (r *saleRepository) Cancel(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Model(&model.Sale{}).
Where("id = ?", id).
Updates(map[string]interface{}{
"status":     "cancelled",
"updated_at": time.Now(),
}).Error
}

func (r *saleRepository) Delete(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Delete(&model.Sale{}, "id = ?", id).Error
}
