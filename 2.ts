// https://discord.com/channels/795981131316985866/1125094089281511474/1189310547972337704

import { Schema } from "@effect/schema";
import { Context, Data, Effect, flow, Layer, Match } from "effect";

interface ConsumerData {
  data: string;
}

class ProviderUnsupportedError extends Data.TaggedError("ProviderUnsupportedError")<{ provider: string }> {
  get message() {
    return `The requested provider ${this.provider} is unsupported`;
  }
}

class GetDataError extends Data.TaggedError("GetDataError")<{ provider: string; cause: unknown }> {
  get message() {
    return `The requested provider ${this.provider} is unsupported`;
  }
}

declare const ProviderBrand: unique symbol;
interface Provider<A> {
  readonly _: unique symbol;
  // "Phantom" type
  readonly [ProviderBrand]: A;
}

class Consumer extends Schema.Class<Consumer>()({
  name: Schema.string,
  provider: Schema.string,
  ref: Schema.string,
}) {}

interface SomeThing {
  get: (consumer: Consumer) => Effect.Effect<never, GetDataError, ConsumerData>;
}

declare const A: Effect.Effect<never, never, SomeThing>;
const ProviderA = Context.Tag<Provider<"A">, SomeThing>("ProviderA");
const ProviderALive = Layer.effect(ProviderA, A);
const getDataFromA = Effect.serviceFunctionEffect(ProviderA, _ => _.get);

// they dont HAVE to share an interface
type MaybeDifferentMaybeNot = SomeThing;

declare const B: Effect.Effect<never, never, MaybeDifferentMaybeNot>;
const ProviderB = Context.Tag<Provider<"B">, MaybeDifferentMaybeNot>("ProviderB");
const ProviderBLive = Layer.effect(ProviderB, B);
const getDataFromB = Effect.serviceFunctionEffect(ProviderB, _ => _.get);

const context = Layer.merge(ProviderALive, ProviderBLive);

declare const consumers: unknown[];

const getConsumerData = Match.type<Consumer>().pipe(
  Match.when({ provider: "A" }, getDataFromA),
  Match.when({ provider: "B" }, getDataFromB),
  Match.orElse(_ => new ProviderUnsupportedError({ provider: _.provider })),
);

const getDataFromProvider = flow(
  Schema.parse(Consumer),
  Effect.andThen(getConsumerData),
);

Effect.partition(consumers, getDataFromProvider).pipe(
  Effect.provide(context),
  Effect.runPromise,
);
