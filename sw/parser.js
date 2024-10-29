/**
 * @param {string} message 
 * @returns 
 */
export const warning = ( message )=> console.warn(`[spider-web-log]: ${message}`);




export class Parser {
      /**
       * @readonly 
       */
      static REF_PROPERTY = 'ref';
      /**
       * @readonly 
       */
      static FOR_PROPERTY = 'for';
      /**
       * @readonly 
       */
      static IF_PROPERTY = 'if';

      /**
       * @readonly 
       */
      static TWO_WAY_DATA_BINDING = 'bind';

      /**
      * @readonly
      */
      static #TEMPLATE_REGEX = /{{[^{{]+}}/gi;
      /**
      * @readonly
       */
      static #FOR_REGEX = /for[\b]*=[\b]*("|'|`)[\b]*[^"'`]+of+[^"'`]+("|'|`)/gi;
      /**
      * @readonly
       */
      static #IF_REGEX = /if[\b]*=[\b]*("|'|`)[^"'`]+("|'|`)/gi;
      /**
      * @readonly
      */
      static #PROPERTY_REGEX = /this(\.[a-zA-Z0-9_$]+|\[("|`|')[a-zA-Z0-9_$]+("|`|')\])/ig;
      
      /**
      * @readonly
      */
      static REF_CLASS = '__sw--private--ref__key';
      /**
      * @readonly
      */
       static BIND_CLASS = '__sw--private--binding--class__key';
      /**
      * @readonly
      */
      static CONDITIONAL_CLASS = '__sw--private--class--if__key';
      /**
      * @readonly
      */
      static EVENT_CLASS = '__sw--private--class--event__key';

      /**
      *  type {string}
      *
      static #duplicationKey;
      /**
      *  type {string}
      *
      static #eventKey;
      /**
      * type {string}
      *
      static #bindingKey;
      /**
      * type {string}
      *
      static #conditionalClassKey;*/

      /**@type {Map<string,Ref<ConditionalProperty>[]>}*/
      static #ifMap = new Map();

      /**@type {Map<number,Ref<ConditionalProperty>>}*/
      static #ifIdMap = new Map();
      
      /**@type {Map<number,number>}*/
      static #condIdKeyMap = new Map();

      /**@type {Map<string, Ref<LoopDescriptor>[]>} */
      static #forMap = new Map();

      static #id = 1;

      /**@type {Map<string, Ref<ReactiveProperty>[]>} */
      static #forPropertiesMap = new Map();
      /**
       * events used inside loops 
       * @type {Map<number,Scope<EventDescriptor>[]>}
       */
      static #eventsMap = new Map();

      /**
       * events that are not used inside for 
       * @type {Ref<EventDescriptor>[]}
       */
      static #events = [];

      /**
      * bindings not initialize inside loop 
      * @type {Map<string, Array<Ref<Binding>>>}
      */
      static #directBind = new Map();

      /**
      * bindings that are used inside loop 
      * @type {Map<string, Array<Binding>>}
      */
      static #indirectBind = new Map();

      /**@hideconstructor*/
      constructor(){}

      /**
       * return all the properties used inside a string, representing an html component
       * @param {string} html 
       */
      static getUsedProperties( html ){
            const matches = html.matchAll( Parser.#TEMPLATE_REGEX );
            const forMatches = html.matchAll( Parser.#FOR_REGEX );
            const ifMatches = html.matchAll( Parser.#IF_REGEX );
            const result = [];

            if( matches ){
                  for( const m of matches ){
                        result.push( ...this.#getUsedProperties( m[0], [], [] ) );
                  }
            }
            if( forMatches ){
                  for( const m of forMatches ){
                        result.push( this.#parseForArgs( 
                              m[0]
                              .replace(/for[\b]*=[\b]*/ig, '')
                              .replace("'", '')
                              .replace('`', '')
                              .replace(/"/ig, '')
                              )[2] );
                  }
            }
            if( ifMatches ){
                  for( const m of ifMatches ){
                        result.push( ...this.#getUsedProperties( 
                              m[0]
                              .replace(/if[\b]*=[\b]*/ig, '')
                              .replace("'", '')
                              .replace('`', '')
                              .replace(/"/ig, '')
                              , [], []) );
                  }
            }
            return [...new Set(result).values()];
      }

      /**
       * parse an html string that uses spiderweb engine, into an object that represents it and that can be used inside the HTMLCustomElement class
       * @param {string} html 
       */
      static parse( html ){
            const dom = new DOMParser().parseFromString( html, "text/html" ).body;

            /*this.#duplicationKey = this.#adjustKey( dom, this.#BASE_KEY );
            this.#conditionalClassKey = this.#adjustKey( dom, this.#BASE_COND_CLASS );
            this.#eventKey = this.#adjustKey( dom, this.#EVENT_CLASS );
            this.#bindingKey = this.#adjustKey( dom, this.#BASE_BIND_KEY );*/

            const propertiesMap = this.#traverse( dom );

            /**
             * @type {ReactiveProperties}
             */
            const descriptor = {
                  dom,
                  properties: propertiesMap,
                  loops: this.#forMap,
                  loopsProperties: this.#forPropertiesMap,
                  //key: this.#duplicationKey,
                  //condKey: this.#conditionalClassKey,
                  conditionals: this.#ifMap,
                  idCondMap: this.#ifIdMap,
                  conditionalRefSet: this.#condIdKeyMap,
                  eventsMap: this.#eventsMap,
                  //eventsKey: this.#eventKey,
                  events: this.#events,
                  bindings: this.#indirectBind,
                  directBindings: this.#directBind,
                  //bindingKey: this.#bindingKey,
            }
            this.#indirectBind = new Map();
            this.#directBind = new Map();
            this.#eventsMap = new Map();
            this.#events = [];
            this.#forMap = new Map();
            this.#forPropertiesMap = new Map();
            this.#ifIdMap = new Map();
            this.#ifMap = new Map();
            this.#condIdKeyMap = new Map();

            return descriptor;
      }
      /**
       * return the baseKey, modified until it isn't found inside the dom
       * @param {string} baseKey
       * @param {HTMLElement} dom 
       */
      static #adjustKey( dom, baseKey ){
            while( dom.querySelector( `[${baseKey}]` ) || dom.querySelector( `.${baseKey}` ) ){
                  baseKey += Math.round( Math.random()*9 );
            }
            return baseKey;
      }

      /**
      * return the string representation of a node with the syntax <node-name [node-property-name]="[node-property-value]"/>
      * @param {HTMLElement} node  
      * @returns {string}
      */
      static #nodeToString( node ){
            if( !node.attributes )
                  return `<${node.outerHTML}/>`
            let prop = '';
            for( const attr of node.attributes ){
                  prop += `${attr.name}="${attr.value}" `;
            }
            return `<${node.outerHTML} ${prop}/>`;
      }

      /**
       * return the property used inside the '{{}}' syntax
       * @param {string} inlineUsage  
       * @param {string[]} args 
       * @param {*} scope 
       */
      static #getUsedProperties( inlineUsage, scope, args ){
            const props = inlineUsage.match( Parser.#PROPERTY_REGEX ) || [];
            const loopParam = [];
            const res = [];

            for( let i = 0; i < args.length; i++ ){
                  if( inlineUsage.match( new RegExp( args[ i ], 'ig' ) ) ){
                        loopParam.push( scope[ i ] );
                  }
            }

            [ ...props, ...loopParam ].map( 
                  prop => prop
                        .replace( 'this.', '' )
                        .replace('this[', '' )
                        .replace(']', '' )
                        .replace( '`', '' )
                        .replace( "'", '' )
                        .replace(/"/ig, '')
                        .trim()
            ).forEach( v =>{
                  if( res.indexOf(v) >= 0 )
                        return;
                  res.push(v);
            });

            return res;
      }

      /**
      * parse the arguments used inside a for attribute, the first element of the array is the variable used inside the for, the last is the array itself
      * @param {string} inline  
      * @return {[string, 'of', string] | []}
      */
      static #parseForArgs( inline ){
            if( !inline.match(/[a-zA-Z0-9\$_]+ of [a-zA-Z0-9\$_]+/) ){
                  return [];
            }
            /**
             * @type {[string, 'of', string]}
             */
            const res = ['','of',''];
            const param = inline.split(' ').map( s => s.trim() );

            res[0] = param[0];
            res[2] = param[2];

            return res;
      }
      /**
       * add a node used inside a for-looped tag, to the refs of the loop
       * @param {Ref<ReactiveProperty> | Ref<LoopDescriptor>} descriptorRef 
       * @param {string[]} scope 
       * @param {boolean} isFor if the element saved is for
       * @example
      ```html
      <div for="a of array">
      {{this.log}}
      </div>
      ``` 
      // save inside referenceMap[array].refs the object
      ```javascript
      {
            isFor: false,
            descriptor: [reference-to-"log"-descriptor]
            key: [the unique id used to identify this.log]
      }   
      ```  
       */
      static #addReferenceToLoop( descriptorRef, scope, isFor ){
            const loop = this.#forMap.get( scope[ scope.length - 1 ] );
            const key = parseInt( descriptorRef.rootNode.getAttribute( Parser.REF_CLASS ) ) || this.#id;

            loop[ loop.length - 1 ].refs.push({
                  key,
                  descriptor: /**@type {Ref<ReactiveProperty>}*/(descriptorRef),
                  isFor: /**@type {false}*/(isFor),
            });

            if( descriptorRef.rootNode.hasAttribute( Parser.REF_CLASS ) )
                  return;
            descriptorRef.rootNode.setAttribute( Parser.REF_CLASS, this.#id + '' );
            this.#id++;
      }
      /**
       * 
       * @param {HTMLElement} rootNode html node that host the attribute. can be span by default or the actual element with the variable attribute
       * @param {string} inlineFunction function that will be executed to define the template value
       * @param {string[]} scope array of arrays names 
       * @param {string | undefined} attributeName the attribute name, if specified, that is dynamically generated `<div {{attributeName}}="id">`
       * @param {string[]} args variables used as parameters for the function
       * @param {boolean} isAttribute 
       */
      static #createPropertyDescriptor( rootNode, inlineFunction, scope, attributeName, args, isAttribute ){
            return {
                  isAttribute,
                  value: new Function( ...args, `return ${inlineFunction.replace('{{', '').replace('}}', '')}` ),
                  rootNode,
                  scope,
                  copies: [], 
                  attributeName,
            }
      }
      /**
       * 
       * @param {Map<string,Ref<ReactiveProperty>[]>} map 
       * @param {Object} descriptor 
       * @param {string} prop the property that is used in the inline function
       * @param {string[]} scope 
       */
      static #addToMap( map, descriptor, prop, scope = [] ){
            let property = map.get( prop );

            if( !property ){
                  property = [];
                  map.set( prop, property );
            }

            property.push(descriptor);

            if( scope.length <= 0 )
                  return;

            this.#addReferenceToLoop(
                  property[property.length - 1],
                  scope,
                  false,
            );
      }


      /**
       * 
       * @param {Map<string,Ref<ReactiveProperty>[]>} map 
       * @param {HTMLElement} node 
       * @param {boolean} isAttribute whether the reference is an html attribute
       * @param {any[]} [args=[]] 
       * @param {string[]} [scope=[]] 
       * 
       * @returns {void}
       */
      static #add( map, node, isAttribute, scope = [], args = [] ){
            
            if( isAttribute ){
                  for( const attr of node.attributes ){

                        if( !attr.value.match( Parser.#TEMPLATE_REGEX ) )
                              continue;

                        const descriptor = this.#createPropertyDescriptor( 
                              node, 
                              attr.value, 
                              scope, 
                              attr.name, 
                              args, 
                              true 
                        );

                        this
                              .#getUsedProperties( attr.value, scope, args )
                              .forEach( prop => this.#addToMap( 
                                    map,
                                    descriptor, 
                                    prop,
                                    scope,
                              ));
                  }
                  return;
            }
            if( node.nodeType !== Node.TEXT_NODE ) 
                  return;

            const text = node.textContent;
            const matches = text.match( Parser.#TEMPLATE_REGEX );
            const newNodeList = [];
            let prev = 0;

            for( let i = 0; i < matches.length; i++ ){
                  const span = document.createElement( 'span' );                  
                  const descriptor = this.#createPropertyDescriptor( 
                        span, 
                        matches[i], 
                        scope, 
                        undefined, 
                        args, 
                        false 
                  );
                  let current = text.indexOf( matches[i], prev );
                  

                  newNodeList.push( 
                        text.substring( 
                              prev,
                              current,
                        ),
                        span
                  );

                  this
                        .#getUsedProperties( matches[i], scope, args )
                        .forEach( prop => this.#addToMap( 
                              map,
                              descriptor, 
                              prop,
                              scope,
                        ) );
                  prev = current + matches[i].length;
                  
            }
            node.replaceWith(...newNodeList, text.substring( prev ) );
      }
      /**
       * 
       * @param {HTMLElement} node 
       * @param {[string, 'of', string]} args 
       * @param {string[]} scope 
       * @param {string[]} params 
       */
      static #setForProperties( node, args, scope, params ){
            const rootNode = document.createElement( 'span' );
            const loopDesc = {
                  rootNode,
                  model: node,
                  scope: [...scope, args[2]],
                  variable: args[2],
                  refs: [],
                  copies: [],
            };
            let ref = this.#forMap.get( args[2] );
            

            node.replaceWith( rootNode );

            if( !ref ){
                  ref = []; 
                  this.#forMap.set( args[2], ref );
            }

            ref.push( loopDesc );  


            if( scope.length > 0 ){
                  this.#addReferenceToLoop(
                        ref[ref.length - 1],
                        scope,
                        true,
                  );
            }

            if( node.hasChildNodes() ){
                  const map = this.#forPropertiesMap;
                  
                  for( const child of node.childNodes ){
                        const cmap = this.#traverse( 
                              /**@type {HTMLElement}*/(child), 
                              args, [...scope, args[2]], 
                              [...params, args[0]] 
                        );
                        const entries = [...cmap.entries()];

                        for( let i = 0; i < entries.length; i++ ){
                              let [k,v] = entries[i];
                              let a = map.get( k );

                              if( !a ){
                                    a = [];
                                    map.set( k, a );
                              }

                              for( let j = 0; j < v.length; j++ ){
                                    a.push({
                                          rootNode: v[j].rootNode,
                                          attributeName: v[j].attributeName,
                                          value: v[j].value,
                                          scope: v[j].scope,
                                          copies: v[j].copies,
                                          //@ts-ignore
                                          ref: loopDesc,
                                    })
                              }
                        }
                  }
            }
      }
      /**
       * @template T
       * @param {Map<T,unknown[]>} map 
       * @param {Map<T,unknown[]>} childMap 
       */
      static #mergeMaps( map, childMap ){
            const entries = [...childMap.entries()];

            for( let i = 0; i < entries.length; i++ ){

                  let [k,v] = entries[i];

                  if( map.has(k) ){
                        map.set( k, [ ...map.get(k), ...v ] );
                  }else{
                        map.set( k, v );
                  }
            }
      }
      /**
      * search for attribute and initialize the corresponding map
      * @param {HTMLElement} node  
      * @param {string[]} scope
      * @param {string[]} params
      */
      static #traverseFor( node, scope, params ){
            const args = this.#parseForArgs( node.getAttribute( Parser.FOR_PROPERTY ) );
            if( args.length != 3 ){
                  warning(`Invalid "for" syntax: ${node.getAttribute( Parser.FOR_PROPERTY )}`);
                  return;
            }
            this.#setForProperties( node, args, scope, params )
            return;
      }
      /**
       * 
       * @param {Map<string,Ref<ConditionalProperty>[]>} map 
       * @param {HTMLElement} ifNode 
       * @param {string[]} scope 
       * @param {string[]} params
       * @param {*} args 
       */
      static #addIfToMap( map, ifNode, args, scope = [], params = [] ){
            const propMap = new Map();
            const inline = ifNode.getAttribute(Parser.IF_PROPERTY)
            const rootNode = document.createElement( 'span' );
            const elseNode =  /**@type {HTMLElement}*/(ifNode.parentNode.querySelector( `[else="${ifNode.getAttribute('e-id')}"]`));
            const id = this.#id;
            const props = this.#getUsedProperties( 
                                    inline, 
                                    scope, 
                                    params
                              );
            const descriptor = {
                  rootNode,
                  ifNode,
                  elseNode,
                  condition: new Function( ...params, `return ${inline}` ),
                  copies: [],
            }
            
            rootNode.classList.add( Parser.CONDITIONAL_CLASS );
            rootNode.setAttribute( Parser.REF_CLASS, id + '' );
            this.#id++;
            ifNode.replaceWith( rootNode );
            
            for( const prop of props ){
                  const property = map.get( prop );
                  if( !property ){
                        map.set( prop, [] );
                  }
                  property.push( descriptor );
            }
            this.#ifIdMap.set( id, descriptor ); 
            
            if( ifNode.hasChildNodes() ){
                  for( const c of ifNode.childNodes ){
                        this.#mergeMaps( 
                              propMap, 
                              this.#traverse(
                                    /**@type {HTMLElement}*/(c),
                                    args,
                                    scope,
                                    params
                              )
                        );
                  }
            }
            if( elseNode ){
                  this.#mergeMaps( 
                        propMap, 
                        this.#traverse(
                              /**@type {HTMLElement}*/(elseNode),
                              args,
                              scope,
                              params
                        )
                  );
                  elseNode.remove();
            }

            if( scope.length > 0 ){
                  for( const n of ifNode.querySelectorAll(`[${Parser.REF_CLASS}]`) ){
                        this.#condIdKeyMap.set( parseInt( n.getAttribute(Parser.REF_CLASS) ), id );
                  }
                  if( elseNode ){
                        for( const n of elseNode.querySelectorAll(`[${Parser.REF_CLASS}]`) ){
                              this.#condIdKeyMap.set( parseInt( n.getAttribute(Parser.REF_CLASS) ), id );
                        }
                  }
            }

            return propMap;
            
      }
      /**
       * 
       * @param {HTMLElement} node 
       * @param {string[]} scope 
       * @param {string[]} args
       */
      static #searchEvents( node, scope = [], args = [] ){
            if( !node.hasAttributes() ){
                  return;
            }
            for( const attr of node.attributes ){
                  if( !attr.name.match(/@[a-z0-9](::once)?/) )
                        continue;


                  const value = new Function( ...args, '$e', attr.value );
                  const ev = attr.name
                        .replace( '@', '' )
                        .replace( '::once', '' );

                  let once = false;
                  
                  
                  if( attr.name.indexOf('::once') >= 0 ){
                        once = true;
                  }
                  if( scope.length > 0 ){
                        if( !node.hasAttribute( Parser.EVENT_CLASS ) ){
                              node.setAttribute( Parser.EVENT_CLASS, this.#id + '' );
                              this.#eventsMap.set( this.#id, [{
                                    once,
                                    scope,
                                    value,
                                    name: ev,
                              }]);
                              this.#id++;
                        }else{
                              this.#eventsMap.get( parseInt( node.getAttribute( Parser.EVENT_CLASS ) ) ).push({
                                    once,
                                    scope,
                                    value,
                                    name: ev,
                              });
                        }
                        
                        
                  }else{
                        this.#events.push({
                              once,
                              value,
                              name: ev,
                              rootNode: node,
                        })
                  }
            }
            
      }
      /**
       * 
       * @param {string} bind 
       */
      static #parseBindingProperties( bind ){
            let data = bind.match(/@data *= *[a-zA-Z0-9$_]+/ig);
            let prop = bind.match(/@prop *= *[a-zA-Z0-9$_]+/ig);
            let event = bind.match(/@event *= *[a-zA-Z0-9$_]+/ig);

            let dataStr;
            let propStr;
            let eventStr;

            if( !data ){
                  warning(' invalid binding. No property to bind');
                  return undefined;
            }

            
            dataStr = data[0]
                  .replace('@data', '')
                  .replace('=', '')
                  .replace(' ', '');

            if( prop ){
                  propStr = prop[0]
                  .replace('@prop', '')
                  .replace('=', '')
                  .replace(' ', '');
            }else{
                  propStr = 'value';
            }
            if( event ){
                  eventStr = event[0]
                  .replace('@event', '')
                  .replace('=', '')
                  .replace(' ', '');
            }else{
                  eventStr = 'change';
            }

            return {
                  data: dataStr,
                  prop: propStr,
                  event: eventStr,
            }
      }
      /**
       * 
       * @param {HTMLElement} node 
       * @param {any[]} scope 
       */
      static #setBinding( node, scope = [] ){
            const { data, prop, event } = this.#parseBindingProperties( 
                  node.getAttribute( Parser.TWO_WAY_DATA_BINDING ) 
            );

            if( data && scope.length > 0 ){
                  let bind = this.#indirectBind.get( data );

                  if( !bind ){
                        bind = [];
                        this.#indirectBind.set( data, bind );
                  }

                  bind[this.#id] = {
                        copies: [],
                        event,
                        prop,
                  };

                  node.setAttribute( Parser.TWO_WAY_DATA_BINDING, data );
                  node.setAttribute( Parser.BIND_CLASS, this.#id + '' );

                  this.#id++;

            }else if( data ){
                  const bind = this.#directBind.get( data ) || [];

                  if( bind.length <= 0 )
                        this.#directBind.set( data, bind );

                  bind.push({
                        rootNode: node,
                        event,
                        prop,
                        copies: [],
                  });
                  
            }
      }
      /**
       * @param {HTMLElement} node  
       * @param {[string, 'of', string]} args 
       * @param {string[]} scope
       * @param {string[]} params parameters used to create function
       * 
       * @returns {Map<string,Ref<ReactiveProperty>[]>}
       */
      static #traverse( node, args = undefined, scope = undefined, params = undefined ){

            /**@type {Map<string,Ref<ReactiveProperty>[]>} */
            const map = new Map();
            const nodeToString = Parser.#nodeToString( node );

            if( node.nodeType == Node.TEXT_NODE ){

                  if( !node.textContent.match( Parser.#TEMPLATE_REGEX ) ) 
                        return map;

                  this.#add( map, node, false, scope, params );
                  return map;
            }

            this.#searchEvents( node, scope, params );

            if( node.hasAttribute(Parser.IF_PROPERTY) ){
                  this.#mergeMaps( 
                        map, 
                        this.#addIfToMap( this.#ifMap, node, args, scope, params  )
                  );

                  if( nodeToString.match( Parser.#TEMPLATE_REGEX ) ){
                        this.#add( map, node, true, scope, params );
                  }

                  return map;
            }

            if( node.hasAttribute(Parser.FOR_PROPERTY) ){
                  if( args ){
                        this.#traverseFor( node, scope, params );
                  }else{
                        this.#traverseFor( node, [], [] );
                  }
                  return new Map();
            }
            if( node.hasAttribute( Parser.TWO_WAY_DATA_BINDING ) ){
                  this.#setBinding( node, scope );
            }

            if( nodeToString.match( Parser.#TEMPLATE_REGEX ) ){
                  this.#add( map, node, true, scope, params );
            }

            if( !node.hasChildNodes() )
                  return map;

            for( const c of [...node.childNodes] ){
                  const cMap = this.#traverse( (/**@type {HTMLElement}*/(c)), args, scope, params );
                  this.#mergeMaps( map, cMap );
            }
            return map;
      }
}