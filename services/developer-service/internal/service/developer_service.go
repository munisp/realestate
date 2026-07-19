package service

import (
"context"
"errors"
"fmt"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"github.com/realestate/developer-service/internal/repository"
"github.com/realestate/developer-service/pkg/kafka"
"github.com/realestate/developer-service/pkg/logger"
)

type DeveloperService struct {
developerRepo repository.DeveloperRepository
projectRepo   repository.ProjectRepository
unitRepo      repository.UnitRepository
milestoneRepo repository.MilestoneRepository
saleRepo      repository.SaleRepository
kafkaProducer *kafka.Producer
logger        *logger.Logger
}

func NewDeveloperService(
developerRepo repository.DeveloperRepository,
projectRepo repository.ProjectRepository,
unitRepo repository.UnitRepository,
milestoneRepo repository.MilestoneRepository,
saleRepo repository.SaleRepository,
kafkaProducer *kafka.Producer,
logger *logger.Logger,
) *DeveloperService {
return &DeveloperService{
developerRepo: developerRepo,
projectRepo:   projectRepo,
unitRepo:      unitRepo,
milestoneRepo: milestoneRepo,
saleRepo:      saleRepo,
kafkaProducer: kafkaProducer,
logger:        logger,
}
}

// Developer operations
func (s *DeveloperService) CreateDeveloper(ctx context.Context, developer *model.Developer) error {
// Check if email already exists
existing, _ := s.developerRepo.GetByEmail(ctx, developer.Email)
if existing != nil {
return errors.New("developer with this email already exists")
}

if err := s.developerRepo.Create(ctx, developer); err != nil {
s.logger.Error("Failed to create developer", "error", err)
return err
}

// Publish event
s.kafkaProducer.PublishEvent("developer.created", map[string]interface{}{
"developer_id": developer.ID.String(),
"email":        developer.Email,
"company_name": developer.CompanyName,
})

s.logger.Info("Developer created", "id", developer.ID)
return nil
}

func (s *DeveloperService) GetDeveloper(ctx context.Context, id uuid.UUID) (*model.Developer, error) {
return s.developerRepo.GetByID(ctx, id)
}

func (s *DeveloperService) ListDevelopers(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Developer, int64, error) {
return s.developerRepo.List(ctx, filters, skip, limit)
}

func (s *DeveloperService) UpdateDeveloper(ctx context.Context, developer *model.Developer) error {
if err := s.developerRepo.Update(ctx, developer); err != nil {
s.logger.Error("Failed to update developer", "error", err)
return err
}

s.kafkaProducer.PublishEvent("developer.updated", map[string]interface{}{
"developer_id": developer.ID.String(),
})

return nil
}

// Project operations
func (s *DeveloperService) CreateProject(ctx context.Context, project *model.Project) error {
// Verify developer exists
_, err := s.developerRepo.GetByID(ctx, project.DeveloperID)
if err != nil {
return errors.New("developer not found")
}

if err := s.projectRepo.Create(ctx, project); err != nil {
s.logger.Error("Failed to create project", "error", err)
return err
}

s.kafkaProducer.PublishEvent("project.created", map[string]interface{}{
"project_id":   project.ID.String(),
"developer_id": project.DeveloperID.String(),
"name":         project.Name,
"type":         project.Type,
})

s.logger.Info("Project created", "id", project.ID)
return nil
}

func (s *DeveloperService) GetProject(ctx context.Context, id uuid.UUID) (*model.Project, error) {
return s.projectRepo.GetByID(ctx, id)
}

func (s *DeveloperService) UpdateProjectProgress(ctx context.Context, projectID uuid.UUID, percent int) error {
project, err := s.projectRepo.GetByID(ctx, projectID)
if err != nil {
return err
}

project.CompletionPercent = percent
if err := s.projectRepo.Update(ctx, project); err != nil {
return err
}

s.kafkaProducer.PublishEvent("project.progress.updated", map[string]interface{}{
"project_id":         projectID.String(),
"completion_percent": percent,
})

return nil
}

// Unit operations
func (s *DeveloperService) CreateUnit(ctx context.Context, unit *model.Unit) error {
// Verify project exists
_, err := s.projectRepo.GetByID(ctx, unit.ProjectID)
if err != nil {
return errors.New("project not found")
}

// Calculate price per sqm
if unit.Area > 0 {
unit.PricePerSqm = unit.Price / unit.Area
}

if err := s.unitRepo.Create(ctx, unit); err != nil {
s.logger.Error("Failed to create unit", "error", err)
return err
}

// Update project unit counts
if err := s.projectRepo.UpdateUnitCounts(ctx, unit.ProjectID); err != nil {
s.logger.Error("Failed to update project unit counts", "error", err)
}

s.kafkaProducer.PublishEvent("unit.created", map[string]interface{}{
"unit_id":    unit.ID.String(),
"project_id": unit.ProjectID.String(),
"price":      unit.Price,
"status":     unit.Status,
})

return nil
}

func (s *DeveloperService) ReserveUnit(ctx context.Context, unitID, userID uuid.UUID) error {
unit, err := s.unitRepo.GetByID(ctx, unitID)
if err != nil {
return err
}

if unit.Status != "available" {
return fmt.Errorf("unit is not available (current status: %s)", unit.Status)
}

if err := s.unitRepo.Reserve(ctx, unitID, userID); err != nil {
return err
}

// Update project counts
if err := s.projectRepo.UpdateUnitCounts(ctx, unit.ProjectID); err != nil {
s.logger.Error("Failed to update project unit counts", "error", err)
}

s.kafkaProducer.PublishEvent("unit.reserved", map[string]interface{}{
"unit_id":    unitID.String(),
"user_id":    userID.String(),
"project_id": unit.ProjectID.String(),
})

return nil
}

func (s *DeveloperService) SellUnit(ctx context.Context, unitID, userID uuid.UUID) error {
unit, err := s.unitRepo.GetByID(ctx, unitID)
if err != nil {
return err
}

if unit.Status == "sold" {
return errors.New("unit is already sold")
}

if err := s.unitRepo.Sell(ctx, unitID, userID); err != nil {
return err
}

// Update project counts
if err := s.projectRepo.UpdateUnitCounts(ctx, unit.ProjectID); err != nil {
s.logger.Error("Failed to update project unit counts", "error", err)
}

s.kafkaProducer.PublishEvent("unit.sold", map[string]interface{}{
"unit_id":    unitID.String(),
"user_id":    userID.String(),
"project_id": unit.ProjectID.String(),
"price":      unit.Price,
})

return nil
}

// Milestone operations
func (s *DeveloperService) CreateMilestone(ctx context.Context, milestone *model.Milestone) error {
if err := s.milestoneRepo.Create(ctx, milestone); err != nil {
return err
}

s.kafkaProducer.PublishEvent("milestone.created", map[string]interface{}{
"milestone_id": milestone.ID.String(),
"project_id":   milestone.ProjectID.String(),
"name":         milestone.Name,
})

return nil
}

func (s *DeveloperService) UpdateMilestoneProgress(ctx context.Context, milestoneID uuid.UUID, percent int) error {
if err := s.milestoneRepo.UpdateProgress(ctx, milestoneID, percent); err != nil {
return err
}

milestone, _ := s.milestoneRepo.GetByID(ctx, milestoneID)
if milestone != nil {
// Update overall project progress
milestones, _ := s.milestoneRepo.GetByProjectID(ctx, milestone.ProjectID)
if len(milestones) > 0 {
totalProgress := 0
for _, m := range milestones {
totalProgress += m.CompletionPercent
}
avgProgress := totalProgress / len(milestones)
s.UpdateProjectProgress(ctx, milestone.ProjectID, avgProgress)
}
}

s.kafkaProducer.PublishEvent("milestone.progress.updated", map[string]interface{}{
"milestone_id":       milestoneID.String(),
"completion_percent": percent,
})

return nil
}

// Sale operations
func (s *DeveloperService) CreateSale(ctx context.Context, sale *model.Sale) error {
// Verify unit exists and is available
unit, err := s.unitRepo.GetByID(ctx, sale.UnitID)
if err != nil {
return err
}

if unit.Status == "sold" {
return errors.New("unit is already sold")
}

if err := s.saleRepo.Create(ctx, sale); err != nil {
return err
}

// Reserve or sell the unit
if sale.Status == "pending" {
s.unitRepo.Reserve(ctx, sale.UnitID, sale.BuyerID)
} else if sale.Status == "approved" || sale.Status == "completed" {
s.unitRepo.Sell(ctx, sale.UnitID, sale.BuyerID)
}

s.kafkaProducer.PublishEvent("sale.created", map[string]interface{}{
"sale_id":    sale.ID.String(),
"unit_id":    sale.UnitID.String(),
"buyer_id":   sale.BuyerID.String(),
"sale_price": sale.SalePrice,
})

return nil
}

func (s *DeveloperService) ApproveSale(ctx context.Context, saleID uuid.UUID) error {
sale, err := s.saleRepo.GetByID(ctx, saleID)
if err != nil {
return err
}

if err := s.saleRepo.Approve(ctx, saleID); err != nil {
return err
}

// Mark unit as sold
s.unitRepo.Sell(ctx, sale.UnitID, sale.BuyerID)

s.kafkaProducer.PublishEvent("sale.approved", map[string]interface{}{
"sale_id": saleID.String(),
"unit_id": sale.UnitID.String(),
})

return nil
}

func (s *DeveloperService) GetInventoryAnalytics(ctx context.Context, projectID uuid.UUID) (map[string]interface{}, error) {
project, err := s.projectRepo.GetByID(ctx, projectID)
if err != nil {
return nil, err
}

totalRevenue := 0.0
sales, _, _ := s.saleRepo.List(ctx, map[string]interface{}{}, 0, 1000)
for _, sale := range sales {
if sale.Status == "completed" || sale.Status == "approved" {
totalRevenue += sale.SalePrice
}
}

return map[string]interface{}{
"project_id":      projectID.String(),
"total_units":     project.TotalUnits,
"available_units": project.AvailableUnits,
"sold_units":      project.Sold Units,
"reserved_units":  project.ReservedUnits,
"total_revenue":   totalRevenue,
"completion":      project.CompletionPercent,
}, nil
}
