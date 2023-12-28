// https://discord.com/channels/795981131316985866/1125094089281511474/1189310547972337704
interface Data {
  data: string;
}

interface Provider {
  readonly _: unique symbol;
}

type ProviderFn = (ref: string) => Effect.Effect<never, string, Data>;

const Provider = Context.Tag<Provider, ProviderFn>("Provider");

const providers: ReadonlyRecord.ReadonlyRecord<ProviderFn> = {
  A: () => Effect.succeed({ data: "aaa" }),
  B: (ref: string) => Effect.fail(`cannot get data for: ${ref}`),
};

interface Consumer {
  name: string;
  provider: string;
  ref: string;
}

const consumers: Consumer[] = [
  { name: "a", provider: "A", ref: "aa" },
  { name: "b", provider: "B", ref: "bb" },
  { name: "c", provider: "C", ref: "cc" },
];

const doSomething = Effect.serviceFunctionEffect(Provider, identity);

// Effect.Effect<never, never, [excluded: string[], satisfying: Data[]]>
const program = Effect.partition(consumers, _ =>
  doSomething(_.ref).pipe(
    Effect.provideServiceEffect( // <- provide the correct provider per consumer
      Provider,
      ReadonlyRecord.get(providers, _.provider), // <- Option<Provider>
    ),
    Effect.catchTag( // <- Mapping to that failure
      "NoSuchElementException",
      () => Effect.fail(`provider ${_.provider} not found`),
    ),
  ));

Effect.runPromise(program).then(console.log).catch(console.error);
