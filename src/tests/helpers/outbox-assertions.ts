import { expect } from "vitest";
import type { Container } from "#/composition/utils/container.js";
import { OUTBOX_REPOSITORY } from "#/composition/utils/tokens.js";
import type { DomainEventCode } from "#/domain/events/domain-event.js";
import type { OutboxAction } from "#/application/ports/persistence/outbox.repository.port.js";

export async function expectOutboxEvent(
  container: Container,
  eventType: DomainEventCode,
  aggregateId?: string,
) {
  const repo = container.resolveSingleton(OUTBOX_REPOSITORY);
  const events = await repo.getPendingEvents(100);
  const event = events.find((e) => e.eventType === eventType);
  expect(event, `expected a ${eventType} event in the outbox`).toBeDefined();
  if (aggregateId) expect(event!.aggregateId).toBe(aggregateId);
  return event!;
}

export async function expectNoOutboxEvent(
  container: Container,
  eventType: DomainEventCode,
) {
  const repo = container.resolveSingleton(OUTBOX_REPOSITORY);
  const events = await repo.getPendingEvents(100);
  expect(events.filter((e) => e.eventType === eventType)).toHaveLength(0);
}

export async function expectOutboxEventCount(
  container: Container,
  eventType: DomainEventCode,
  count: number,
) {
  const repo = container.resolveSingleton(OUTBOX_REPOSITORY);
  const events = await repo.getPendingEvents(100);
  expect(events.filter((e) => e.eventType === eventType)).toHaveLength(count);
}

export async function expectOutboxJob(
  container: Container,
  jobType: OutboxAction,
  payloadMatch?: Record<string, unknown>,
) {
  const repo = container.resolveSingleton(OUTBOX_REPOSITORY);
  const jobs = await repo.getPendingJobs(100);
  const job = jobs.find((j) => j.eventType === jobType);
  expect(job, `expected a ${jobType} job in the outbox`).toBeDefined();
  if (payloadMatch) expect(job!.payload).toMatchObject(payloadMatch);
  return job!;
}

export async function expectNoOutboxJob(
  container: Container,
  jobType: OutboxAction,
) {
  const repo = container.resolveSingleton(OUTBOX_REPOSITORY);
  const jobs = await repo.getPendingJobs(100);
  expect(jobs.filter((j) => j.eventType === jobType)).toHaveLength(0);
}
