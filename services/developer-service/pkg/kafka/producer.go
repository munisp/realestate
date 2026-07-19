package kafka

import (
"context"
"encoding/json"
"os"
"strings"

"github.com/segmentio/kafka-go"
)

type Producer struct {
writer *kafka.Writer
}

func NewProducer() (*Producer, error) {
brokers := strings.Split(os.Getenv("KAFKA_BROKERS"), ",")

writer := &kafka.Writer{
Addr:     kafka.TCP(brokers...),
Balancer: &kafka.LeastBytes{},
}

return &Producer{writer: writer}, nil
}

func (p *Producer) PublishEvent(topic string, data map[string]interface{}) error {
value, err := json.Marshal(data)
if err != nil {
return err
}

return p.writer.WriteMessages(context.Background(), kafka.Message{
Topic: topic,
Value: value,
})
}

func (p *Producer) Close() error {
return p.writer.Close()
}
