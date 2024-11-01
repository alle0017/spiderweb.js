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
      static ELSE_ID_PROPERTY = 'else-id';

      /**
       * @readonly 
       */
      static POINTER_ATTRIBUTE_EVENTS = 'private--sw--pointer--events';

      /**
       * @readonly 
       */
      static POINTER_ATTRIBUTE_TEMPLATE = 'private--sw--pointer--template';

      /**
       * @readonly 
       */
      static POINTER_ATTRIBUTE_BINDING = 'private--sw--pointer--binding';

      /**
       * @readonly 
       */
      static POINTER_ATTRIBUTE_CONDITIONAL = 'private--sw--pointer--conditional';
      /**
       * @readonly 
       */
      static POINTER_ATTRIBUTE_LOOP = 'private--sw--pointer--loop';

      /**
      * @readonly
      */
      static #TEMPLATE_REGEX = /{{[^{{]+}}/gi;
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

      #elementId = 0;

      /**@type {Map<string,SoftRef<ConditionalCloneable>[]>}*/
      #conditionalMap = new Map();

      /**@type {Map<number,SoftRef<ConditionalCloneable>>}*
      //#conditionalIdMap = new Map();*/
      
      /**@type {Map<number,number>}*/
      #conditionalIdKeyMap = new Map();

      /**@type {Map<string, SoftRef<LoopCloneableDescriptor>[]>} */
      #loopMap = new Map();

      #id = 1;

      /**@type {Map<string, SoftRef<ReactiveProperty>[]>} */
      #forPropertiesMap = new Map();
      /**
       * events used inside loops 
       * @type {Map<number,Scope<EventDescriptor>[]>}
       */
      #eventsMap = new Map();

      /**
       * events that are not used inside for 
       * @type {SoftRef<EventDescriptor>[]}
       */
      #events = [];

      /**
      * bindings not initialize inside loop 
      * @type {Map<string, Array<SoftRef<Binding>>>}
      */
      #directBind = new Map();

      /**
      * bindings that are used inside loop 
      * @type {Map<string, Array<Binding>>}
      */
      #indirectBind = new Map();

      /**
       * @type {Set<string>}
       */
      #usedProperties = new Set();

      /**
       * @type {Stack<SoftRef<LoopCloneableDescriptor>>}
       */
      #loopsStack = [];

      get __pointer(){
            return (this.#elementId++) + '';
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
       * 
       * @param {Map<string,SoftRef<ReactiveProperty>[]>} map 
       * @param {SoftRef<ReactiveProperty>} descriptor 
       * @param {HTMLElement} node 
       * @param {string} prop the property that is used in the inline function
       * @param {string[]} scope 
       */
      #addToMap( map, node, descriptor, prop, scope = [] ){

            let property = map.get( prop );

            if( !property ){
                  property = [];
                  map.set( prop, property );
                  this.#usedProperties.add( prop );
            }

            property.push( descriptor );

            if( scope.length <= 0 )
                  return;

            this.#addExternReferenceToLoop(
                  node,
                  scope,
                  false,
                  prop,
                  property.length-1,
            );
      }

      /**
      * parse the arguments used inside a for attribute, the first element of the array is the variable used inside the for, the last is the array itself
      * @param {string} inline  
      * @return {[string, 'of', string] | []}
      */
      static #parseLoopArgs( inline ){

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


      constructor(){}

      /**
      * @param {HTMLElement} node 
      * @param {string[]} scope 
      * @param {string[]} args
      */
      #searchEvents( node, scope = [], args = [] ){
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
                        let pointer;

                        if( node.hasAttribute( Parser.POINTER_ATTRIBUTE_EVENTS ) ){
                              pointer = node.getAttribute( Parser.POINTER_ATTRIBUTE_EVENTS );
                        }else{
                              pointer = this.__pointer;
                              node.setAttribute( Parser.POINTER_ATTRIBUTE_EVENTS, pointer );
                        }

                        this.#events.push({
                              once,
                              value,
                              name: ev,
                              rootClass: pointer,
                        });
                  }
            }
            
      }

      /**
       * return the property used inside the '{{}}' syntax
       * @param {string} inlineUsage  
       * @param {string[]} args 
       * @param {*} scope 
       */
      #getUsedProperties( inlineUsage, scope, args ){
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
       * 
       * @param {Map<string,SoftRef<ReactiveProperty>[]>} map 
       * @param {HTMLElement} node 
       * @param {string[]} [args=[]] 
       * @param {string[]} [scope=[]] 
       * 
       * @returns {void}
       */
      #addRefToAttribute( map, node, scope = [], args = [] ){
            const pointer = this.__pointer;
            node.setAttribute( Parser.POINTER_ATTRIBUTE_TEMPLATE,  pointer );

            for( const attr of node.attributes ){

                  if( !attr.value.match( Parser.#TEMPLATE_REGEX ) )
                        continue;

                  const descriptor = {
                        value: new Function( ...args, `return ${attr.value.replace('{{', '').replace('}}', '')}` ),
                        rootClass: pointer,
                        scope,
                        copies: [], 
                        attributeName: attr.name,
                  };
                  this
                        .#getUsedProperties( attr.value, scope, args )
                        .forEach( prop => {
                              this.#addToMap( 
                                    map,
                                    node,
                                    descriptor, 
                                    prop,
                                    scope,
                              );
                              this.#usedProperties.add( prop );
                        });
            }
      }

      /**
       * 
       * @param {Map<string,SoftRef<ReactiveProperty>[]>} map 
       * @param {HTMLElement} node 
       * @param {string[]} [args=[]] 
       * @param {string[]} [scope=[]] 
       * 
       * @returns {void}
       */
      #addReferenceToTemplate( map, node, scope = [], args = [] ){


            if( node.nodeType !== Node.TEXT_NODE ) 
                  return;

            const text = node.textContent;
            const matches = text.match( Parser.#TEMPLATE_REGEX );
            const newNodeList = [];
            let prev = 0;

            for( let i = 0; i < matches.length; i++ ){
                  const pointer = this.__pointer;
                  const span = document.createElement( 'span' );
                  const descriptor = {
                        value: new Function( ...args, `return ${matches[i].replace('{{', '').replace('}}', '')}` ),
                        rootClass: pointer,
                        scope,
                        copies: [], 
                        attributeName: undefined,
                  }

                  span.setAttribute( Parser.POINTER_ATTRIBUTE_TEMPLATE, pointer );

                  

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
                              span,
                              descriptor, 
                              prop,
                              scope,
                        ));
                  prev = current + matches[i].length;
                  
            }
            node.replaceWith(...newNodeList, text.substring( prev ) );
      }

      /**
       * 
       * @param {string} bind 
       */
      #parseBindingProperties( bind ){
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

            this.#usedProperties.add( dataStr );

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
       * @param {string[]} scope 
       */
      #addBinding( node, scope = [] ){
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
                  const pointer = this.__pointer;

                  if( bind.length <= 0 )
                        this.#directBind.set( data, bind );

                  node.setAttribute( Parser.POINTER_ATTRIBUTE_BINDING, pointer )


                  bind.push({
                        rootClass: pointer,
                        event,
                        prop,
                        copies: [],
                  });

            }
      }
      /**
       * 
       * @param {Map<string,SoftRef<ReactiveProperty>[]>} map 
       * @param {HTMLElement} ifNode 
       * @param {string[]} scope 
       * @param {string[]} params
       * @param {[string, "of", string]} args 
       */
      #addConditionalToMap( map, ifNode, args, scope, params ){

            const inline = ifNode.getAttribute(Parser.IF_PROPERTY)
            const rootNode = document.createElement( 'span' );
            const elseNode =  /**@type {HTMLElement}*/(ifNode.parentNode.querySelector( `[else="${ifNode.getAttribute(Parser.ELSE_ID_PROPERTY)}"]`));
            const id = this.#id;
            const pointer = this.__pointer;
            const ifPointer = this.__pointer;
            const elsePointer = elseNode? 
                  this.__pointer: 
                  undefined;
            const props = this.#getUsedProperties( 
                  inline, 
                  scope, 
                  params
            );
            /**
             * @type {SoftRef<ConditionalCloneable>}
             */
            const descriptor = {
                  rootClass: pointer,
                  ifNode: ifPointer,
                  elseNode: elsePointer,
                  condition: new Function( ...params, `return ${inline}` ),
                  id,
            }
            
            rootNode.setAttribute( Parser.POINTER_ATTRIBUTE_CONDITIONAL, pointer );
            rootNode.classList.add( Parser.CONDITIONAL_CLASS );
            rootNode.setAttribute( Parser.REF_CLASS, id + '' );

            this.#id++;

            ifNode.before( rootNode );
            ifNode.setAttribute( Parser.POINTER_ATTRIBUTE_CONDITIONAL, ifPointer );
            elseNode && elseNode.setAttribute( Parser.POINTER_ATTRIBUTE_CONDITIONAL, elsePointer );

            
            for( const prop of props ){
                  let property = this.#conditionalMap.get( prop );
                  if( !property ){
                        property = [];
                        this.#conditionalMap.set( prop, property );
                        this.#usedProperties.add( prop );
                  }
                  property.push( descriptor );
            }

            //this.#conditionalIdMap.set( id, descriptor ); 
            
            if( ifNode.hasChildNodes() ){
                  for( const c of ifNode.childNodes ){
                        this.#traverse(
                              /**@type {HTMLElement}*/(c),
                              args,
                              scope,
                              params,
                              map
                        );
                  }
            }
            if( elseNode && elseNode.hasChildNodes() ){
                  for( const c of elseNode.childNodes ){
                        this.#traverse(
                              /**@type {HTMLElement}*/(c),
                              args,
                              scope,
                              params,
                              map
                        );
                  }
            }

            if( scope.length > 0 ){
                  for( const n of ifNode.querySelectorAll(`[${Parser.REF_CLASS}]`) ){
                        this.#conditionalIdKeyMap.set( parseInt( n.getAttribute(Parser.REF_CLASS) ), id );
                  }
                  if( elseNode ){
                        for( const n of elseNode.querySelectorAll(`[${Parser.REF_CLASS}]`) ){
                              this.#conditionalIdKeyMap.set( parseInt( n.getAttribute(Parser.REF_CLASS) ), id );
                        }
                  }
            }
      }

      /**
       * add a node used inside a for-looped tag, to the refs of the loop
       * @param {HTMLElement} node
       * @param {string[]} scope 
       * @param {boolean} isFor if the element saved is for
       * @param {string} id
       * @param {number} index
       * @example
      ```html
      <div for="a of array">
      {{this.log}}
      </div>
      ``` 
      // save inside referenceMap[array].refs the object
      ```javascript
      const x = {
            isFor: false,
            descriptor: [reference-to-"log"-descriptor],
            key: [the unique id used to identify "log" <span>],
      }   
      ```  
       */
      #addExternReferenceToLoop( node, scope, isFor, id, index ){
            //const loop = this.#loopMap.get( scope.at(-1) ).at(-1);
            const key = parseInt( node.getAttribute( Parser.REF_CLASS ) ) || this.#id;

            this.#loopsStack.at( -1 ).refs.push({
                  key,
                  isFor,
                  refKey: {
                        id,
                        index,
                  }
            });

            if( node.hasAttribute( Parser.REF_CLASS ) )
                  return;

            node.setAttribute( Parser.REF_CLASS, this.#id + '' );
            this.#id++;
      }

      /**
       * 
       * @param {HTMLElement} node 
       * @param {[string, 'of', string]} args 
       * @param {string[]} scope 
       * @param {string[]} params 
       */
      #setLoopProperties( node, args, scope, params ){
            const pointer = this.__pointer;
            const nodePointer = this.__pointer;
            const rootNode = document.createElement( 'span' );
            const loopDesc = {
                  rootClass: pointer,
                  model: nodePointer,
                  scope: [...scope, args[2]],
                  variable: args[2],
                  refs: [],
                  copies: [],
            };
            let ref = this.#loopMap.get( args[2] );

            rootNode.setAttribute( Parser.POINTER_ATTRIBUTE_LOOP, pointer );

            node.before( rootNode );
            node.setAttribute( Parser.POINTER_ATTRIBUTE_LOOP, nodePointer );

            if( !ref ){
                  ref = []; 
                  this.#loopMap.set( args[2], ref );
                  this.#usedProperties.add( args[2] );
            }

            ref.push( loopDesc );  

            if( scope.length > 0 ){
                  this.#addExternReferenceToLoop(
                        rootNode,
                        scope,
                        true,
                        args[2],
                        ref.length-1,
                  );
            }

            this.#loopsStack.push( loopDesc );

            if( node.hasChildNodes() ){
                  const map = this.#forPropertiesMap;
                  
                  for( const child of node.childNodes ){
                        this.#traverse( 
                              /**@type {HTMLElement}*/(child), 
                              args, 
                              [...scope, args[2]], 
                              [...params, args[0]],
                              map,
                        );
                  }
            }

            this.#loopsStack.pop();
      }

      /**
      * search for attribute and initialize the corresponding map
      * @param {HTMLElement} node  
      * @param {string[]} scope
      * @param {string[]} params
      */
      #addLoopToMap( node, scope, params ){
            const args = Parser.#parseLoopArgs( node.getAttribute( Parser.FOR_PROPERTY ) );
            if( args.length != 3 ){
                  warning(`Invalid "for" syntax: ${node.getAttribute( Parser.FOR_PROPERTY )}`);
                  return;
            }
            this.#setLoopProperties( node, args, scope, params );
      }

      /**
       * @param {HTMLElement} node  
       * @param {[string, 'of', string]} args 
       * @param {string[]} scope
       * @param {string[]} params parameters used to create function
       * @param {Map<string,SoftRef<ReactiveProperty>[]> | null} oldmap
       * 
       * @returns {Map<string,SoftRef<ReactiveProperty>[]>}
       */
      #traverse( node, args, scope, params, oldmap ){

            /**@type {Map<string,SoftRef<ReactiveProperty>[]>} */
            const map = oldmap || new Map();
            const nodeToString = Parser.#nodeToString( node );

            if( node.nodeType == Node.TEXT_NODE ){

                  if( node.textContent.match( Parser.#TEMPLATE_REGEX ) ){
                        this.#addReferenceToTemplate( 
                              map,
                              node,
                              scope,
                              params
                        );
                  }
                  //is text node
                  //arrived to leaf
                  return map;
            }

            this.#searchEvents( node, scope, params );

            if( node.hasAttribute(Parser.IF_PROPERTY) ){

                  this.#addConditionalToMap( map, node, args, scope, params );

                  if( nodeToString.match( Parser.#TEMPLATE_REGEX ) ){
                        this.#addRefToAttribute( map, node, scope, params );
                  }

                  // already traversed inside this.addConditional
                  return map;
            }

            if( node.hasAttribute(Parser.FOR_PROPERTY) ){
                  if( args ){
                        this.#addLoopToMap( node, scope, params );
                  }else{
                        this.#addLoopToMap( node, [], [] );
                  }
                  return new Map();
            }
            if( node.hasAttribute( Parser.TWO_WAY_DATA_BINDING ) )
                  this.#addBinding( node, scope );

            if( nodeToString.match( Parser.#TEMPLATE_REGEX ) )
                  this.#addRefToAttribute( map, node, scope, params );

            if( !node.hasChildNodes() )
                  return map;

            for( const c of [...node.childNodes] ){
                  this.#traverse( (/**@type {HTMLElement}*/(c)), args, scope, params, map );
            }
            return map;
      }

      /**
       * 
       * @param {string} html 
       * @returns {ReactiveCloneable}
       */
      createReactiveCloneable( html ){
            const body = new DOMParser().parseFromString( html, "text/html" ).body;
            const dom = document.createElement('span');
            
            dom.append( ...body.children )

            const propertiesMap = this.#traverse( dom, undefined, [], [], null );

            /**
             * @type {ReactiveCloneable}
             */
            const descriptor = {
                  dom,
                  properties: propertiesMap,
                  loops: this.#loopMap,
                  loopsProperties: this.#forPropertiesMap, 
                  conditionals: this.#conditionalMap,
                  //idCondMap: this.#conditionalIdMap,
                  conditionalRefSet: this.#conditionalIdKeyMap,
                  eventsMap: this.#eventsMap,
                  events: this.#events,
                  bindings: this.#indirectBind,
                  directBindings: this.#directBind,
                  usedProperties: this.#usedProperties,
            };
            
            this.#usedProperties = new Set();
            this.#indirectBind = new Map();
            this.#directBind = new Map();
            this.#eventsMap = new Map();
            this.#events = [];
            this.#loopMap = new Map();
            this.#forPropertiesMap = new Map();
            //this.#conditionalIdMap = new Map();
            this.#conditionalMap = new Map();
            this.#conditionalIdKeyMap = new Map();

            return descriptor;
      }
}

