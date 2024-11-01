type Ref<T extends {}> = {
      rootNode: HTMLElement,
} & T;

type SoftRef<T extends {}> = {
      rootClass: string,
} & T;

type Copy<T> = {
      scope: any[],
} & T;

type Scope<T extends {}> = {
      scope: string[],
} & T;

type RefToLoop<T extends {}> = {
      ref: LoopDescriptor,
} & T;

type ConditionalCopy = { 
      ifCpy: HTMLElement, 
      elseCpy: HTMLElement, 
}

type PropertyCopy = {}

type ConditionalProperty = {
      ifNode: HTMLElement,
      elseNode: HTMLElement,
      condition: Function,
      copies: Ref<Copy<ConditionalCopy>>[],
}

type ConditionalCloneable = {
      ifNode: string,
      elseNode: string,
      condition: Function,
      id: number,
}

type ExternRef = {
      isFor: true,
      descriptor: Ref<LoopDescriptor>,
      key: number,
} | {
      descriptor: Ref<ReactiveProperty>,
      key: number,
      isFor: false,
};

type LoopDescriptor = {
      model: HTMLElement,
      scope: Array<string>,
      variable: string,
      /**
       * reference to the property used inside the loop
       */
      refs: Array<ExternRef>,
      /**
       * reference to all the copies of the loop
       */
      copies: Ref<Copy<{}>>[]//Array<ExternRef>,
}



type ExternCloneableRef = {
      /**
       * rootKey
       */
      key: number,
      isFor: boolean,
      refKey: {
            id: string,
            index: number,
      },
};

type LoopCloneableDescriptor = {
      model: string,
      scope: string[],
      variable: string,
      refs: Array<ExternCloneableRef>,
      copies: Array<ExternCloneableRef>,
}



type ReactiveProperty = {
      attributeName: undefined | string,
      value: Function,
      scope: Array<string>,
      copies: Ref<Copy<PropertyCopy>>[],
}

type Binding = {
      prop: string,
      event: string,
      copies: HTMLElement[],
};

type EventDescriptor = {
      once: boolean,
      value: Function,
      name: string,
}

type DuplicateNode = {
      scope: string[];
      root: HTMLElement;
}

type ReactiveCloneable = {
      dom: HTMLElement,

      //eventsKey: string,
      //condKey: string,
      //key: string,
      //bindingKey: string,

      properties: Map<string, SoftRef<ReactiveProperty>[]>,
      loops: Map<string, SoftRef<LoopCloneableDescriptor>[]>,
      loopsProperties: Map<string, SoftRef<ReactiveProperty>[]>,
      conditionals: Map<string,SoftRef<ConditionalCloneable>[]>,
      //idCondMap: Map<number,SoftRef<ConditionalCloneable>>,
      events: SoftRef<EventDescriptor>[],
      bindings: Map<string, Binding[]>,
      directBindings: Map<string, SoftRef<Binding>[]>,
      conditionalRefSet: Map<number,number>,
      eventsMap: Map<number, Scope<EventDescriptor>[]>,
      usedProperties: Set<string>,
      //toDelete: string[];
}


type ReactiveProperties = {

      dom: HTMLElement,

      //eventsKey: string,
      //condKey: string,
      //key: string,
      //bindingKey: string,

      properties: Map<string, Ref<ReactiveProperty>[]>,
      loops: Map<string, Ref<LoopDescriptor>[]>,
      loopsProperties: Map<string, Ref<ReactiveProperty>[]>,
      conditionals: Map<string,Ref<ConditionalProperty>[]>,
      idCondMap: Map<number,Ref<ConditionalProperty>>,
      //events: Ref<EventDescriptor>[],
      bindings: Map<string, Binding[]>,
      directBindings: Map<string, Ref<Binding>[]>,
      conditionalRefSet: Map<number,number>,
      eventsMap: Map<number, Scope<EventDescriptor>[]>

}
type CompilerFlags = {
      __MARKDOWN: boolean,
      __NO_COMPILE: boolean,
}

type ElementDescriptor = ({
      template: string;
      name: string;
      props: {
          [x: string]: any;
      } & import("./custom-element.js").HTMLCustomElement;
      watched: Array<string>;
} | {
      name: string;
      component: typeof import("./swcomponent.js").default
}) & CompilerFlags;

interface Stack<T> {
      push( v: T ): void;
      pop(): T;
      at( index: -1 ): T;
      length: number;
}

type Replicable = {
      copies: Ref<Copy<PropertyCopy>>[];
}