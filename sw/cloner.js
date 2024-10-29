import { Parser } from "./compiler.js";
export default class Cloner {

      /**
       * @type {ReactiveCloneable}
       * @readonly
       */
      #descriptor;

      /**
       * @type {HTMLElement}
       */
      #dom;

      /**
       * @type {HTMLElement[]}
       */
      #toRemove = [];

      /**
       * 
       * @param {ReactiveCloneable} descriptor 
       */
      constructor( descriptor ) {
            this.#descriptor = descriptor;
      }

    

      /**
       * @param {Readonly<Map<string, SoftRef<ReactiveProperty>[]>>} map
       * @returns {Map<string, Ref<ReactiveProperty>[]>}
       */
      #cloneReactivePropertyMap( map ) {
            /**
             * @type {Map<string, Ref<ReactiveProperty>[]>}
             */
            const rmap = new Map();
            /**
             * @type {Map<string, Ref<{}>>}
             */
            const refs = new Map();

            for( const [k,v] of map.entries() ){
                  /**
                   * @type {Ref<ReactiveProperty>[]}
                   */
                  const a = [];

                  for( let i = 0; i < v.length; i++ ){
                        let desc = refs.get( v[i].rootClass );

                        if( !desc ){
                              desc = {
                                    rootNode: this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_TEMPLATE}="${v[i].rootClass}"]`), 
                                    //copies: []
                              };

                              refs.set( v[i].rootClass, desc );
                        }
                        a.push({
                              rootNode: desc.rootNode,
                              attributeName: v[i].attributeName,
                              value: v[i].value,
                              scope: v[i].scope,
                              copies: []
                        });
                  }

                  rmap.set( k, a );
            }

            return rmap;
      }
      //TODO
      //riscrivere la parte di copy perchè sennò ogni ref singola ha una copia nuova dell'array
      // hint: usa v[i].rootClass come chiave di una mappa dove tieni gli array
      #cloneLoopedProperties(){
            /**
             * @type {Map<string, Ref<ReactiveProperty>[]>}
             */
            const rmap = new Map();
            /**
             * @type {Map<string, Ref<Object>>}
             */
            const refs = new Map();

            for( const [k,v] of this.#descriptor.loopsProperties.entries() ){
                  /**
                   * @type {Ref<ReactiveProperty>[]}
                   */
                  const a = [];

                  for( let i = 0; i < v.length; i++ ){
                        let desc = refs.get( v[i].rootClass );

                        if( !desc ){
                              const rootNode = /**@type {HTMLElement}*/(this.#dom.querySelector(`[${Parser.POINTER_ATTRIBUTE_TEMPLATE}="${v[i].rootClass}"]`));

                              desc = {
                                    rootNode,
                              };
                              refs.set( v[i].rootClass, desc );
                        }

                        a.push({
                              rootNode: desc.rootNode,

                              attributeName: v[i].attributeName,
                              value: v[i].value,
                              scope: v[i].scope,
                              //attributeName: desc.attributeName,
                              //value: desc.value,
                              //scope: desc.scope,
                              copies: [],
                        });
                  }

                  rmap.set( k, a );
            }

            return rmap;
      }

      /**
       * @param {Map<string, Ref<ReactiveProperty>[]>} loopsMap 
       * @returns {Map<string, Ref<LoopDescriptor>[]>}
       */
      #cloneLoop( loopsMap ){
            /**
             * @type {Map<string, Ref<LoopDescriptor>[]>}
             */
            const cmap = new Map();
            const entries = [...this.#descriptor.loops.entries()];

            for( let i = 0; i < entries.length; i++ ){
                  const [k,v] = entries[i];
                  /**
                   * @type {Ref<LoopDescriptor>[]}
                   */
                  const a = [];

                  for( let j = 0; j < v.length; j++ ){
                        const model = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_LOOP}="${v[j].model}"]` ));
                        const rootNode = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_LOOP}="${v[j].rootClass}"]` ));
                        
                        this.#toRemove.push( model );

                        a.push({
                              rootNode,
                              model,
                              scope: v[j].scope,
                              variable: v[j].variable,
                              refs: [],
                              copies: []
                        });
                  }
                  cmap.set( k, a );
            }

            for( let i = 0; i < entries.length; i++ ){
                  const [k,v] = entries[i];
                  /**
                   * @type {Ref<LoopDescriptor>[]}
                   */
                  const a = cmap.get( k );

                  for( let j = 0; j < v.length; j++ ){
                        for( let x = 0; x < v[j].refs.length; x++ ){
                              const desc = v[j].refs[x];
                              if( desc.isFor ){
                                    const ref = cmap.get( desc.refKey.id )[ desc.refKey.index ];
                                    a[j].refs.push({
                                          isFor: true,
                                          descriptor: ref,
                                          key: desc.key,
                                    });
                              }else{
                                    const ref = loopsMap.get( desc.refKey.id )[ desc.refKey.index ];

                                    a[j].refs.push({
                                          isFor: false,
                                          descriptor: ref,
                                          key: desc.key,
                                    });
                              }
                        }
                  }
            }

            return cmap; 
      }

      /**
       * @returns {{ cmap: Map<string, Ref<ConditionalProperty>[]>; cConditionalIdMap: Map<number, Ref<ConditionalProperty>>;}}
       */
      #cloneConditionals(){
            const entries = [...this.#descriptor.conditionals.entries()];
            /**
            * @type {Map<string, Ref<ConditionalProperty>[]>}
            */
            const cmap = new Map();
            /**
            * @type {Map<number, Ref<ConditionalProperty>>}
            */
            const cConditionalIdMap = new Map();

            for( let idx = 0; idx < entries.length; idx++ ){
                  const [k,v] = entries[idx];
                  /**
                   * @type {Ref<ConditionalProperty>[]}
                   */
                  const a = [];

                  for( let i = 0; i < v.length; i++ ){

                        let desc = cConditionalIdMap.get( v[i].id );

                        if( !desc ){

                              const rootNode = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_CONDITIONAL}="${v[i].rootClass}"]` ));
                              const ifNode = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_CONDITIONAL}="${v[i].ifNode}"]` ));
                              const elseNode = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_CONDITIONAL}="${v[i].elseNode}"]` ));

                              this.#toRemove.push( ifNode );
                              elseNode && this.#toRemove.push( elseNode );

                              desc = {
                                    rootNode,
                                    ifNode,
                                    elseNode,
                                    condition: v[i].condition,
                                    copies: []
                              };

                              cConditionalIdMap.set( v[i].id, desc );
                        }

                        a.push( desc );
                  }

                  cmap.set( k, a );

            }
            return {
                  cmap,
                  cConditionalIdMap,
            };
      }
      /**
       * @param {HTMLElement} self 
       */
      #addEventsToDOM( self ){
            for( const evDesc of this.#descriptor.events ){

                  const rootNode = this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_EVENTS}="${evDesc.rootClass}"]` );

                  const handler = ( ev =>{
                        evDesc.value.bind( self )(ev);
                        if( evDesc.once ){
                              rootNode.removeEventListener( evDesc.name, handler );
                        }
                  }).bind( self );

                  rootNode.addEventListener( evDesc.name, handler );
            }
      }
      /**
       * @returns {Map<string, Ref<Binding>[]>}
       */
      #cloneDirectBindings(){
            /**
            * @returns {Map<string, Ref<Binding>[]>}
            */
            const cmap = new Map();
            const entries = [...this.#descriptor.directBindings.entries()];

            for( let idx = 0; idx < entries.length; idx++ ){
                  /**
                   * @type {Ref<Binding>[]}
                   */
                  const a = [];
                  const [k,v] = entries[ idx ];
                  
                  for( let i = 0; i < v.length; i++ ){
                        const rootNode = /**@type {HTMLElement}*/(this.#dom.querySelector( `[${Parser.POINTER_ATTRIBUTE_BINDING}="${v[i].rootClass}"]` ));

                        a.push({
                              rootNode,
                              prop: v[i].prop,
                              event: v[i].event,
                              copies: []
                        });
                  }

                  cmap.set( k, a );
            }
            return cmap;
      }

      #removeHiddenElements(){
            
            for( let i = 0; i < this.#toRemove.length; i++ ){
                  this.#toRemove[i].remove();
            }

            this.#toRemove = [];
      }
      /**
       * @param {HTMLElement} self 
       * @returns {ReactiveProperties}
       */
      clone( self ){

            this.#dom = /**@type {HTMLElement}*/(this.#descriptor.dom.cloneNode( true ));

            //creo le reference
            // poi elimino le parti dell'html da eliminare solo dopo

            const dom = this.#dom;
            const properties = this.#cloneReactivePropertyMap( this.#descriptor.properties );
            const loopsProperties = this.#cloneLoopedProperties();
            const loops = this.#cloneLoop( loopsProperties );
            const { cmap: conditionals, cConditionalIdMap: idCondMap } = this.#cloneConditionals();
            const directBindings = this.#cloneDirectBindings();

            this.#addEventsToDOM( self );
            this.#removeHiddenElements();

            
            return {
                  dom,

                  properties,
                  loops,
                  loopsProperties,
                  conditionals,
                  idCondMap,

                  bindings: this.#descriptor.bindings,
                  directBindings,
                  conditionalRefSet: this.#descriptor.conditionalRefSet,
                  eventsMap: this.#descriptor.eventsMap,
            }
      }
}