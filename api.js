import { createCustomExtensibleElement, createCustomElement } from "./sw/custom-element.js";
import MDParser from "./sw/md.js";
import { include, imports } from "./sw/ui.js";
import { Router } from "./sw/router.js";
import SWComponent from "./sw/swcomponent.js";

/**
 * @param {ElementDescriptor} descriptor 
 */
export const define = ( descriptor )=>{
      if( descriptor.__MARKDOWN ){
            if( 'template' in descriptor){
                  descriptor.template = new MDParser(descriptor.template).toHTML();
            }else{
                  descriptor.component.html = new MDParser(descriptor.component.html).toHTML();
            }
      }

      if( 'template' in descriptor){
            createCustomExtensibleElement(
                  descriptor.name,
                  descriptor.template,
                  descriptor.props,
                  descriptor.watched
            );
      }else{
            createCustomElement(
                  descriptor.name,
                  descriptor.component
            );
      }

      
}

/**
 * # ⚠ deprecation warning
 * create and append new component
 * @param {string} name
 * @param {Record<string,any>} props
 * @param {HTMLElement} node
 * @deprecated
 */
export const append = (name, props = {}, node = document.body)=>{
      
}

/**
 * create a new custom element
 * @param {string} componentName 
 * @param {HTMLElement} root 
 */
export const initialize = ( componentName, root = document.body ) => root.appendChild( document.createElement( componentName ) );

export { MDParser, include, imports, Router };
export default SWComponent;