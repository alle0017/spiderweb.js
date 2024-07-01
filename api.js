import { createCustomElement } from "./sw/custom-element.js";
import MDParser from "./sw/md.js";


/**
 * @typedef {Object} ElementDescriptor
 * @property {string} template
 * @property {string} name
 * @property {Object.<string, any> & HTMLElement } props
 * @property {boolean} markdown
 * @property {Array<string>} watched
 */

/**@param {ElementDescriptor} descriptor */
export const define = ( descriptor )=>{
      if( descriptor.markdown ){
            descriptor.template = new MDParser(descriptor.template).toHTML();
      }
      createCustomElement(
            descriptor.name,
            descriptor.template,
            descriptor.props,
            descriptor.watched
      );
}
/**
 * create new component
 * @param {string} name
 * @returns {HTMLCustomElement}
 */
export const create = (name)=>{
      return CustomElementRegistry.create(name);
}
/**
 * create and append new component
 * @param {string} name
 * @param {Record<string,string>} props
 * @param {HTMLElement} node
 * @returns {HTMLCustomElement | undefined}
 */
export const append = (name, props = {}, node = document.body)=>{
      const el = CustomElementRegistry.create(name);
      if( !el ) return;
      node.appendChild(el);
      for( let [k,v] of Object.entries(props) ){
            if( v instanceof Array )
                  el.setArray(k,v);
            else
                  el.setAttribute(k,v);
      }
      return el;
}

define({
      name: 'string-preview',
      template: /*html*/`<span aria-text="{{this._str}}">{{this._str}}</span>`,
      props: {
            _fullStr: '',
            _max: 10,
            get text(){
                  return this._fullStr;
            },
            set text(value){
                  if( !value || typeof value !== 'string' || value === this._str )
                        return;
                  this._fullStr = value;
                  this._str = value.length >= this._max? value.substring( 0, this._max - 3 ) + '...': value;
            },
            get max(){
                  return this._max;
            },
            set max( value ){
                  if( !value || typeof value !== 'number' || this._max == value )
                        return;
                  this._max = value;
                  this._str = this._fullStr.length >= this._max? this._fullStr.substring( 0, this._max - 3 ) + '...': this._fullStr;
            },
            onenter(){
                  const max = this.getAttribute('max');
                  const value = this.getAttribute('text');
                  
                  if( max )
                        this.max = parseInt(max);
                  if( value )
                        this.text = value;

            }
      }
})