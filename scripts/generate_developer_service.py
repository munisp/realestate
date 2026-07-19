#!/usr/bin/env python3
"""
Developer Service Code Generator
Generates complete Go implementation for Developer Service
"""

import os
from pathlib import Path

BASE_DIR = Path("/home/ubuntu/realestate-platform/services/developer-service")

# Repository implementations
REPOSITORIES = {
    "unit_repository.go": '''package repository

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
''',
    
    "milestone_repository.go": '''package repository

import (
"context"
"errors"
"time"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"gorm.io/gorm"
)

type MilestoneRepository interface {
Create(ctx context.Context, milestone *model.Milestone) error
GetByID(ctx context.Context, id uuid.UUID) (*model.Milestone, error)
GetByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.Milestone, error)
Update(ctx context.Context, milestone *model.Milestone) error
UpdateProgress(ctx context.Context, id uuid.UUID, percent int) error
Complete(ctx context.Context, id uuid.UUID) error
Delete(ctx context.Context, id uuid.UUID) error
}

type milestoneRepository struct {
db *gorm.DB
}

func NewMilestoneRepository(db *gorm.DB) MilestoneRepository {
return &milestoneRepository{db: db}
}

func (r *milestoneRepository) Create(ctx context.Context, milestone *model.Milestone) error {
return r.db.WithContext(ctx).Create(milestone).Error
}

func (r *milestoneRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Milestone, error) {
var milestone model.Milestone
err := r.db.WithContext(ctx).Preload("Project").First(&milestone, "id = ?", id).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("milestone not found")
}
return nil, err
}
return &milestone, nil
}

func (r *milestoneRepository) GetByProjectID(ctx context.Context, projectID uuid.UUID) ([]*model.Milestone, error) {
var milestones []*model.Milestone
err := r.db.WithContext(ctx).
Where("project_id = ?", projectID).
Order("planned_date ASC").
Find(&milestones).Error
return milestones, err
}

func (r *milestoneRepository) Update(ctx context.Context, milestone *model.Milestone) error {
milestone.UpdatedAt = time.Now()
return r.db.WithContext(ctx).Save(milestone).Error
}

func (r *milestoneRepository) UpdateProgress(ctx context.Context, id uuid.UUID, percent int) error {
status := "in_progress"
if percent >= 100 {
status = "completed"
}

return r.db.WithContext(ctx).Model(&model.Milestone{}).
Where("id = ?", id).
Updates(map[string]interface{}{
"completion_percent": percent,
"status":            status,
"updated_at":        time.Now(),
}).Error
}

func (r *milestoneRepository) Complete(ctx context.Context, id uuid.UUID) error {
now := time.Now()
return r.db.WithContext(ctx).Model(&model.Milestone{}).
Where("id = ?", id).
Updates(map[string]interface{}{
"status":             "completed",
"completion_percent": 100,
"actual_date":        now,
"updated_at":         now,
}).Error
}

func (r *milestoneRepository) Delete(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Delete(&model.Milestone{}, "id = ?", id).Error
}
''',

    "sale_repository.go": '''package repository

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
'''
}

def generate_repositories():
    """Generate all repository files"""
    repo_dir = BASE_DIR / "internal" / "repository"
    repo_dir.mkdir(parents=True, exist_ok=True)
    
    for filename, content in REPOSITORIES.items():
        filepath = repo_dir / filename
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Created {filename}")

if __name__ == "__main__":
    print("Generating Developer Service repositories...")
    generate_repositories()
    print("\nRepository generation complete!")
