package repository

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
