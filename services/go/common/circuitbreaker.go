package common

import (
	"errors"
	"sync"
	"time"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

// CircuitBreaker implements the circuit breaker pattern
type CircuitBreaker struct {
	name           string
	maxFailures    uint32
	timeout        time.Duration
	resetTimeout   time.Duration
	state          CircuitState
	failures       uint32
	lastFailTime   time.Time
	lastSuccessTime time.Time
	mu             sync.RWMutex
	onStateChange  func(from, to CircuitState)
}

var (
	ErrCircuitOpen     = errors.New("circuit breaker is open")
	ErrTooManyRequests = errors.New("too many requests")
)

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(name string, maxFailures uint32, timeout, resetTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		name:          name,
		maxFailures:   maxFailures,
		timeout:       timeout,
		resetTimeout:  resetTimeout,
		state:         StateClosed,
		failures:      0,
	}
}

// Execute runs the given function with circuit breaker protection
func (cb *CircuitBreaker) Execute(fn func() error) error {
	if !cb.canExecute() {
		return ErrCircuitOpen
	}

	err := fn()
	
	if err != nil {
		cb.recordFailure()
		return err
	}

	cb.recordSuccess()
	return nil
}

// canExecute checks if the circuit breaker allows execution
func (cb *CircuitBreaker) canExecute() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	now := time.Now()

	switch cb.state {
	case StateClosed:
		return true

	case StateOpen:
		// Check if we should transition to half-open
		if now.Sub(cb.lastFailTime) > cb.resetTimeout {
			cb.setState(StateHalfOpen)
			return true
		}
		return false

	case StateHalfOpen:
		// Allow one request in half-open state
		return true

	default:
		return false
	}
}

// recordFailure records a failed execution
func (cb *CircuitBreaker) recordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failures++
	cb.lastFailTime = time.Now()

	switch cb.state {
	case StateClosed:
		if cb.failures >= cb.maxFailures {
			cb.setState(StateOpen)
		}

	case StateHalfOpen:
		// Failed in half-open state, go back to open
		cb.setState(StateOpen)
	}
}

// recordSuccess records a successful execution
func (cb *CircuitBreaker) recordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.lastSuccessTime = time.Now()

	switch cb.state {
	case StateHalfOpen:
		// Success in half-open state, close the circuit
		cb.failures = 0
		cb.setState(StateClosed)

	case StateClosed:
		// Reset failure count on success
		cb.failures = 0
	}
}

// setState changes the circuit breaker state
func (cb *CircuitBreaker) setState(newState CircuitState) {
	if cb.state == newState {
		return
	}

	oldState := cb.state
	cb.state = newState

	if cb.onStateChange != nil {
		go cb.onStateChange(oldState, newState)
	}
}

// GetState returns the current state
func (cb *CircuitBreaker) GetState() CircuitState {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}

// GetFailures returns the current failure count
func (cb *CircuitBreaker) GetFailures() uint32 {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.failures
}

// Reset resets the circuit breaker to closed state
func (cb *CircuitBreaker) Reset() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	
	cb.failures = 0
	cb.setState(StateClosed)
}

// OnStateChange sets a callback for state changes
func (cb *CircuitBreaker) OnStateChange(fn func(from, to CircuitState)) {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.onStateChange = fn
}

// HTTPCircuitBreaker wraps HTTP calls with circuit breaker
type HTTPCircuitBreaker struct {
	breakers map[string]*CircuitBreaker
	mu       sync.RWMutex
}

// NewHTTPCircuitBreaker creates a new HTTP circuit breaker manager
func NewHTTPCircuitBreaker() *HTTPCircuitBreaker {
	return &HTTPCircuitBreaker{
		breakers: make(map[string]*CircuitBreaker),
	}
}

// GetOrCreate gets or creates a circuit breaker for a service
func (hcb *HTTPCircuitBreaker) GetOrCreate(serviceName string, maxFailures uint32, timeout, resetTimeout time.Duration) *CircuitBreaker {
	hcb.mu.RLock()
	breaker, exists := hcb.breakers[serviceName]
	hcb.mu.RUnlock()

	if exists {
		return breaker
	}

	hcb.mu.Lock()
	defer hcb.mu.Unlock()

	// Double-check after acquiring write lock
	breaker, exists = hcb.breakers[serviceName]
	if exists {
		return breaker
	}

	breaker = NewCircuitBreaker(serviceName, maxFailures, timeout, resetTimeout)
	hcb.breakers[serviceName] = breaker

	return breaker
}

// Get retrieves a circuit breaker by name
func (hcb *HTTPCircuitBreaker) Get(serviceName string) (*CircuitBreaker, bool) {
	hcb.mu.RLock()
	defer hcb.mu.RUnlock()
	
	breaker, exists := hcb.breakers[serviceName]
	return breaker, exists
}

// GetAllStates returns the state of all circuit breakers
func (hcb *HTTPCircuitBreaker) GetAllStates() map[string]CircuitState {
	hcb.mu.RLock()
	defer hcb.mu.RUnlock()

	states := make(map[string]CircuitState)
	for name, breaker := range hcb.breakers {
		states[name] = breaker.GetState()
	}

	return states
}
