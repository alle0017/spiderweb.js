import { define } from "../../api.js";

define({
      name: 'string-preview',
      template: /*html*/`
            <span aria-text="{{this._str}}" title="{{this._fullStr}}">{{this._str}}</span>
            <style>
                  body {
                        padding: 0;
                        margin: 0;
                  }
            </style>
      `,
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