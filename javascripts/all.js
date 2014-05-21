$(window).scroll(function() {
  var oVal;
  oVal = $(window).scrollTop() / 240;
  return $(".blur").css("opacity", oVal);
});
$(document).ready( function(){
  $('body').find('.header-section,.new,.blur').height($(window).height());
});
// jquery.event.move
//
// 1.3.6
//
// Stephen Band
//
// Triggers 'movestart', 'move' and 'moveend' events after
// mousemoves following a mousedown cross a distance threshold,
// similar to the native 'dragstart', 'drag' and 'dragend' events.
// Move events are throttled to animation frames. Move event objects
// have the properties:
//
// pageX:
// pageY:   Page coordinates of pointer.
// startX:
// startY:  Page coordinates of pointer at movestart.
// distX:
// distY:  Distance the pointer has moved since movestart.
// deltaX:
// deltaY:  Distance the finger has moved since last event.
// velocityX:
// velocityY:  Average velocity over last few events.


(function (module) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], module);
	} else {
		// Browser globals
		module(jQuery);
	}
})(function(jQuery, undefined){

	var // Number of pixels a pressed pointer travels before movestart
	    // event is fired.
	    threshold = 6,
	
	    add = jQuery.event.add,
	
	    remove = jQuery.event.remove,

	    // Just sugar, so we can have arguments in the same order as
	    // add and remove.
	    trigger = function(node, type, data) {
	    	jQuery.event.trigger(type, data, node);
	    },

	    // Shim for requestAnimationFrame, falling back to timer. See:
	    // see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	    requestFrame = (function(){
	    	return (
	    		window.requestAnimationFrame ||
	    		window.webkitRequestAnimationFrame ||
	    		window.mozRequestAnimationFrame ||
	    		window.oRequestAnimationFrame ||
	    		window.msRequestAnimationFrame ||
	    		function(fn, element){
	    			return window.setTimeout(function(){
	    				fn();
	    			}, 25);
	    		}
	    	);
	    })(),
	    
	    ignoreTags = {
	    	textarea: true,
	    	input: true,
	    	select: true,
	    	button: true
	    },
	    
	    mouseevents = {
	    	move: 'mousemove',
	    	cancel: 'mouseup dragstart',
	    	end: 'mouseup'
	    },
	    
	    touchevents = {
	    	move: 'touchmove',
	    	cancel: 'touchend',
	    	end: 'touchend'
	    };


	// Constructors
	
	function Timer(fn){
		var callback = fn,
		    active = false,
		    running = false;
		
		function trigger(time) {
			if (active){
				callback();
				requestFrame(trigger);
				running = true;
				active = false;
			}
			else {
				running = false;
			}
		}
		
		this.kick = function(fn) {
			active = true;
			if (!running) { trigger(); }
		};
		
		this.end = function(fn) {
			var cb = callback;
			
			if (!fn) { return; }
			
			// If the timer is not running, simply call the end callback.
			if (!running) {
				fn();
			}
			// If the timer is running, and has been kicked lately, then
			// queue up the current callback and the end callback, otherwise
			// just the end callback.
			else {
				callback = active ?
					function(){ cb(); fn(); } : 
					fn ;
				
				active = true;
			}
		};
	}


	// Functions
	
	function returnTrue() {
		return true;
	}
	
	function returnFalse() {
		return false;
	}
	
	function preventDefault(e) {
		e.preventDefault();
	}
	
	function preventIgnoreTags(e) {
		// Don't prevent interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }
		
		e.preventDefault();
	}

	function isLeftButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function identifiedTouch(touchList, id) {
		var i, l;

		if (touchList.identifiedTouch) {
			return touchList.identifiedTouch(id);
		}
		
		// touchList.identifiedTouch() does not exist in
		// webkit yet… we must do the search ourselves...
		
		i = -1;
		l = touchList.length;
		
		while (++i < l) {
			if (touchList[i].identifier === id) {
				return touchList[i];
			}
		}
	}

	function changedTouch(e, event) {
		var touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		// Chrome Android (at least) includes touches that have not
		// changed in e.changedTouches. That's a bit annoying. Check
		// that this touch has changed.
		if (touch.pageX === event.pageX && touch.pageY === event.pageY) { return; }

		return touch;
	}


	// Handlers that decide when the first movestart is triggered
	
	function mousedown(e){
		var data;

		if (!isLeftButton(e)) { return; }

		data = {
			target: e.target,
			startX: e.pageX,
			startY: e.pageY,
			timeStamp: e.timeStamp
		};

		add(document, mouseevents.move, mousemove, data);
		add(document, mouseevents.cancel, mouseend, data);
	}

	function mousemove(e){
		var data = e.data;

		checkThreshold(e, data, e, removeMouse);
	}

	function mouseend(e) {
		removeMouse();
	}

	function removeMouse() {
		remove(document, mouseevents.move, mousemove);
		remove(document, mouseevents.cancel, mouseend);
	}

	function touchstart(e) {
		var touch, template;

		// Don't get in the way of interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }

		touch = e.changedTouches[0];
		
		// iOS live updates the touch objects whereas Android gives us copies.
		// That means we can't trust the touchstart object to stay the same,
		// so we must copy the data. This object acts as a template for
		// movestart, move and moveend event objects.
		template = {
			target: touch.target,
			startX: touch.pageX,
			startY: touch.pageY,
			timeStamp: e.timeStamp,
			identifier: touch.identifier
		};

		// Use the touch identifier as a namespace, so that we can later
		// remove handlers pertaining only to this touch.
		add(document, touchevents.move + '.' + touch.identifier, touchmove, template);
		add(document, touchevents.cancel + '.' + touch.identifier, touchend, template);
	}

	function touchmove(e){
		var data = e.data,
		    touch = changedTouch(e, data);

		if (!touch) { return; }

		checkThreshold(e, data, touch, removeTouch);
	}

	function touchend(e) {
		var template = e.data,
		    touch = identifiedTouch(e.changedTouches, template.identifier);

		if (!touch) { return; }

		removeTouch(template.identifier);
	}

	function removeTouch(identifier) {
		remove(document, '.' + identifier, touchmove);
		remove(document, '.' + identifier, touchend);
	}


	// Logic for deciding when to trigger a movestart.

	function checkThreshold(e, template, touch, fn) {
		var distX = touch.pageX - template.startX,
		    distY = touch.pageY - template.startY;

		// Do nothing if the threshold has not been crossed.
		if ((distX * distX) + (distY * distY) < (threshold * threshold)) { return; }

		triggerStart(e, template, touch, distX, distY, fn);
	}

	function handled() {
		// this._handled should return false once, and after return true.
		this._handled = returnTrue;
		return false;
	}

	function flagAsHandled(e) {
		e._handled();
	}

	function triggerStart(e, template, touch, distX, distY, fn) {
		var node = template.target,
		    touches, time;

		touches = e.targetTouches;
		time = e.timeStamp - template.timeStamp;

		// Create a movestart object with some special properties that
		// are passed only to the movestart handlers.
		template.type = 'movestart';
		template.distX = distX;
		template.distY = distY;
		template.deltaX = distX;
		template.deltaY = distY;
		template.pageX = touch.pageX;
		template.pageY = touch.pageY;
		template.velocityX = distX / time;
		template.velocityY = distY / time;
		template.targetTouches = touches;
		template.finger = touches ?
			touches.length :
			1 ;

		// The _handled method is fired to tell the default movestart
		// handler that one of the move events is bound.
		template._handled = handled;
			
		// Pass the touchmove event so it can be prevented if or when
		// movestart is handled.
		template._preventTouchmoveDefault = function() {
			e.preventDefault();
		};

		// Trigger the movestart event.
		trigger(template.target, template);

		// Unbind handlers that tracked the touch or mouse up till now.
		fn(template.identifier);
	}


	// Handlers that control what happens following a movestart

	function activeMousemove(e) {
		var timer = e.data.timer;

		e.data.touch = e;
		e.data.timeStamp = e.timeStamp;
		timer.kick();
	}

	function activeMouseend(e) {
		var event = e.data.event,
		    timer = e.data.timer;
		
		removeActiveMouse();

		endEvent(event, timer, function() {
			// Unbind the click suppressor, waiting until after mouseup
			// has been handled.
			setTimeout(function(){
				remove(event.target, 'click', returnFalse);
			}, 0);
		});
	}

	function removeActiveMouse(event) {
		remove(document, mouseevents.move, activeMousemove);
		remove(document, mouseevents.end, activeMouseend);
	}

	function activeTouchmove(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = changedTouch(e, event);

		if (!touch) { return; }

		// Stop the interface from gesturing
		e.preventDefault();

		event.targetTouches = e.targetTouches;
		e.data.touch = touch;
		e.data.timeStamp = e.timeStamp;
		timer.kick();
	}

	function activeTouchend(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		removeActiveTouch(event);
		endEvent(event, timer);
	}

	function removeActiveTouch(event) {
		remove(document, '.' + event.identifier, activeTouchmove);
		remove(document, '.' + event.identifier, activeTouchend);
	}


	// Logic for triggering move and moveend events

	function updateEvent(event, touch, timeStamp, timer) {
		var time = timeStamp - event.timeStamp;

		event.type = 'move';
		event.distX =  touch.pageX - event.startX;
		event.distY =  touch.pageY - event.startY;
		event.deltaX = touch.pageX - event.pageX;
		event.deltaY = touch.pageY - event.pageY;
		
		// Average the velocity of the last few events using a decay
		// curve to even out spurious jumps in values.
		event.velocityX = 0.3 * event.velocityX + 0.7 * event.deltaX / time;
		event.velocityY = 0.3 * event.velocityY + 0.7 * event.deltaY / time;
		event.pageX =  touch.pageX;
		event.pageY =  touch.pageY;
	}

	function endEvent(event, timer, fn) {
		timer.end(function(){
			event.type = 'moveend';

			trigger(event.target, event);
			
			return fn && fn();
		});
	}


	// jQuery special event definition

	function setup(data, namespaces, eventHandle) {
		// Stop the node from being dragged
		//add(this, 'dragstart.move drag.move', preventDefault);
		
		// Prevent text selection and touch interface scrolling
		//add(this, 'mousedown.move', preventIgnoreTags);
		
		// Tell movestart default handler that we've handled this
		add(this, 'movestart.move', flagAsHandled);

		// Don't bind to the DOM. For speed.
		return true;
	}
	
	function teardown(namespaces) {
		remove(this, 'dragstart drag', preventDefault);
		remove(this, 'mousedown touchstart', preventIgnoreTags);
		remove(this, 'movestart', flagAsHandled);
		
		// Don't bind to the DOM. For speed.
		return true;
	}
	
	function addMethod(handleObj) {
		// We're not interested in preventing defaults for handlers that
		// come from internal move or moveend bindings
		if (handleObj.namespace === "move" || handleObj.namespace === "moveend") {
			return;
		}
		
		// Stop the node from being dragged
		add(this, 'dragstart.' + handleObj.guid + ' drag.' + handleObj.guid, preventDefault, undefined, handleObj.selector);
		
		// Prevent text selection and touch interface scrolling
		add(this, 'mousedown.' + handleObj.guid, preventIgnoreTags, undefined, handleObj.selector);
	}
	
	function removeMethod(handleObj) {
		if (handleObj.namespace === "move" || handleObj.namespace === "moveend") {
			return;
		}
		
		remove(this, 'dragstart.' + handleObj.guid + ' drag.' + handleObj.guid);
		remove(this, 'mousedown.' + handleObj.guid);
	}
	
	jQuery.event.special.movestart = {
		setup: setup,
		teardown: teardown,
		add: addMethod,
		remove: removeMethod,

		_default: function(e) {
			var event, data;
			
			// If no move events were bound to any ancestors of this
			// target, high tail it out of here.
			if (!e._handled()) { return; }

			function update(time) {
				updateEvent(event, data.touch, data.timeStamp);
				trigger(e.target, event);
			}

			event = {
				target: e.target,
				startX: e.startX,
				startY: e.startY,
				pageX: e.pageX,
				pageY: e.pageY,
				distX: e.distX,
				distY: e.distY,
				deltaX: e.deltaX,
				deltaY: e.deltaY,
				velocityX: e.velocityX,
				velocityY: e.velocityY,
				timeStamp: e.timeStamp,
				identifier: e.identifier,
				targetTouches: e.targetTouches,
				finger: e.finger
			};

			data = {
				event: event,
				timer: new Timer(update),
				touch: undefined,
				timeStamp: undefined
			};
			
			if (e.identifier === undefined) {
				// We're dealing with a mouse
				// Stop clicks from propagating during a move
				add(e.target, 'click', returnFalse);
				add(document, mouseevents.move, activeMousemove, data);
				add(document, mouseevents.end, activeMouseend, data);
			}
			else {
				// We're dealing with a touch. Stop touchmove doing
				// anything defaulty.
				e._preventTouchmoveDefault();
				add(document, touchevents.move + '.' + e.identifier, activeTouchmove, data);
				add(document, touchevents.end + '.' + e.identifier, activeTouchend, data);
			}
		}
	};

	jQuery.event.special.move = {
		setup: function() {
			// Bind a noop to movestart. Why? It's the movestart
			// setup that decides whether other move events are fired.
			add(this, 'movestart.move', jQuery.noop);
		},
		
		teardown: function() {
			remove(this, 'movestart.move', jQuery.noop);
		}
	};
	
	jQuery.event.special.moveend = {
		setup: function() {
			// Bind a noop to movestart. Why? It's the movestart
			// setup that decides whether other move events are fired.
			add(this, 'movestart.moveend', jQuery.noop);
		},
		
		teardown: function() {
			remove(this, 'movestart.moveend', jQuery.noop);
		}
	};

	add(document, 'mousedown.move', mousedown);
	add(document, 'touchstart.move', touchstart);

	// Make jQuery copy touch event properties over to the jQuery event
	// object, if they are not already listed. But only do the ones we
	// really need. IE7/8 do not have Array#indexOf(), but nor do they
	// have touch events, so let's assume we can ignore them.
	if (typeof Array.prototype.indexOf === 'function') {
		(function(jQuery, undefined){
			var props = ["changedTouches", "targetTouches"],
			    l = props.length;
			
			while (l--) {
				if (jQuery.event.props.indexOf(props[l]) === -1) {
					jQuery.event.props.push(props[l]);
				}
			}
		})(jQuery);
	};
});
(function($){

  $.fn.twentytwenty = function(options) {
    var options = $.extend({default_offset_pct: 0.5}, options);
    return this.each(function() {

      var sliderPct = options.default_offset_pct;
      var container = $(this);
      
      container.wrap("<div class='twentytwenty-wrapper'></div>");
      container.append("<div class='twentytwenty-overlay'></div>");
      var beforeImg = container.find("img:first");
      var afterImg = container.find("img:last");
      container.append("<div class='twentytwenty-handle'></div>");
      var slider = container.find(".twentytwenty-handle");
      slider.append("<span class='twentytwenty-left-arrow'></span>");
      slider.append("<span class='twentytwenty-right-arrow'></span>");
      container.addClass("twentytwenty-container");
      beforeImg.addClass("twentytwenty-before");
      afterImg.addClass("twentytwenty-after");
      
      var overlay = container.find(".twentytwenty-overlay");
      overlay.append("<div class='twentytwenty-before-label'></div>");
      overlay.append("<div class='twentytwenty-after-label'></div>");

      var calcOffset = function(widthPct) {
        var w = beforeImg.width();
        var h = beforeImg.height();
        return {
          w: w+"px",
          h: h+"px",
          cw: (widthPct*w)+"px"
        };
      };

      var adjustContainer = function(offset) {
        beforeImg.css("clip", "rect(0,"+offset.cw+","+offset.h+",0)");
        container.css("height", offset.h);
      };

      var adjustSlider = function(pct) {
        var offset = calcOffset(pct);
        //slider.css("height", offset.h);
        slider.css("left", offset.cw);
        adjustContainer(offset);
      }

      $(window).on("resize.twentytwenty", function(e) {
        adjustSlider(sliderPct);
      });

      var offsetX = 0;
      var imgWidth = 0;
      
      container.on("movestart", function(e) {
        if ((e.distX > e.distY && e.distX < -e.distY) || (e.distX < e.distY && e.distX > -e.distY)) {
          e.preventDefault();
        }
        container.addClass("active");
        offsetX = container.offset().left;
        imgWidth = beforeImg.width();          
      });

      container.on("moveend", function(e) {
        container.removeClass("active");
      });

      container.on("move", function(e) {
        if (container.hasClass("active")) {
          sliderPct = (e.pageX-offsetX)/imgWidth;
          if (sliderPct < 0) {
            sliderPct = 0;
          }
          if (sliderPct > 1) {
            sliderPct = 1;
          }
          adjustSlider(sliderPct);
        }
      });

      container.find("img").on("mousedown", function(event) {
        event.preventDefault();
      });

      $(window).trigger("resize.twentytwenty");
    });
  };

})(jQuery);
$(document).ready(function() {
	var $body = $('body');

	$('.popover').on('click', function(event) {
		event.preventDefault();
		$body.find('#popover-content').addClass('visible');
	});

	$('.close').on('click', function(event) {
		event.preventDefault();
		$(this).parent().removeClass('visible');
		$body.find('.navigation-area').addClass('visible');
	});
});
(function($){
  $(document).ready(function(){
    var $nameField = $('#name'),
        $emailField = $('#email')

    $nameField.on('keyup', function() {
      var $this = $(this),
          $status = $this.parent().find('.status'),
          val = $this.val();

      if(
        val != "" &&
        val.length > 2 &&
        val.length < 10
      ) {
        $status.addClass('flip')
      } else {
        $status.removeClass('flip')
      }

    })

    $emailField.on('keyup', function() {
      var $this = $(this),
          $status = $this.parent().find('.status'),
          val = $this.val();

      if(
        val != "" &&
        val.length > 3 &&
        val.length < 40 &&
        val.indexOf('@') >= 0 &&
        val.indexOf('@') != val.length-1
      ) {
        $status.addClass('flip')
      } else {
        $status.removeClass('flip')
      }

    })
  })
})(jQuery)
;



/*
 * jQuery beforeafter plugin
 * @author admin@catchmyfame.com - http://www.catchmyfame.com
 * @version 1.4
 * @date September 19, 2011
 * @category jQuery plugin
 * @copyright (c) 2009 admin@catchmyfame.com (www.catchmyfame.com)
 * @license CC Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0) - http://creativecommons.org/licenses/by-nc-sa/3.0/
 */

(function($){
  $.fn.extend({
    beforeAfter: function(options)
    {
      var defaults =
      {
        animateIntro : false,
        introDelay : 1000,
        introDuration : 1000,
        introPosition : .5,
        showFullLinks : true,
        beforeLinkText: 'Show only before',
        afterLinkText: 'Show only after',
        imagePath : './js/',
        cursor: 'pointer',
        clickSpeed: 600,
        linkDisplaySpeed: 200,
        dividerColor: '#888',
        enableKeyboard: false,
        keypressAmount: 20,
        onReady: function(){}
      };
    var options = $.extend(defaults, options);

    var randID =  Math.round(Math.random()*100000000);

        return this.each(function() {
      var o=options;
      var obj = $(this);

      var imgWidth = $('img:first', obj).width();
      var imgHeight = $('img:first', obj).height();

      if( $('div',obj).length != 2 ) $('img',obj).wrap('<div>'); // For backwards compatability. Used to require images to be wrapped in div tags.

      $(obj)
      .width(imgWidth)
      .height(imgHeight)
      .css({'overflow':'hidden','position':'relative','padding':'0'});

      var bef = $('img:first', obj).attr('src');
      var aft = $('img:last', obj).attr('src');

      $('img:first', obj).attr('id','beforeimage'+randID);
      $('img:last', obj).attr('id','afterimage'+randID);

      // Create an inner div wrapper (dragwrapper) to hold the images.
      $(obj).prepend('<div id="dragwrapper'+randID+'"><div id="drag'+randID+'"><img width="8" height="56" alt="handle" src="'+o.imagePath+'handle.gif" id="handle'+randID+'" /></div></div>'); // Create drag handle
      $('#dragwrapper'+randID).css({'opacity':.25,'position':'absolute','padding':'0','left':(imgWidth*o.introPosition)-($('#handle'+randID).width()/2)+'px','z-index':'20'}).width($('#handle'+randID).width()).height(imgHeight);

      $('div:eq(2)', obj).height(imgHeight).width(imgWidth*o.introPosition).css({'position':'absolute','overflow':'hidden','left':'0px','z-index':'10'}); // Set CSS properties of the before image div
      $('div:eq(3)', obj).height(imgHeight).width(imgWidth).css({'position':'absolute','overflow':'hidden','right':'0px'}); // Set CSS properties of the after image div
      $('#drag'+randID).width(2).height(imgHeight).css({'background':o.dividerColor,'position':'absolute','left':'3px'}); // Set drag handle CSS properties
      $('#beforeimage'+randID).css({'position':'absolute','top':'0px','left':'0px'});
      $('#afterimage'+randID).css({'position':'absolute','top':'0px','right':'0px'});
      $('#handle'+randID).css({'z-index':'100','position':'relative','cursor':o.cursor,'top':(imgHeight/2)-($('#handle'+randID).height()/2)+'px','left':'-3px'})

      $(obj).append('<img src="'+o.imagePath+'lt-small.png" width="7" height="15" id="lt-arrow'+randID+'"><img src="'+o.imagePath+'rt-small.png" width="7" height="15" id="rt-arrow'+randID+'">');

      if(o.showFullLinks)
      {
        $(obj).after('<div class="balinks" id="links'+randID+'" style="position:relative"><span class="balinks"><a id="showleft'+randID+'" href="javascript:void(0)">'+o.beforeLinkText+'</a></span><span class="balinks"><a id="showright'+randID+'" href="javascript:void(0)">'+o.afterLinkText+'</a></span></div>');
        $('#links'+randID).width(imgWidth);
        $('#showleft'+randID).css({'position':'relative','left':'0px'}).click(function(){
          $('div:eq(2)', obj).animate({width:imgWidth},o.linkDisplaySpeed);
          $('#dragwrapper'+randID).animate({left:imgWidth-$('#dragwrapper'+randID).width()+'px'},o.linkDisplaySpeed);
        });
        $('#showright'+randID).css({'position':'absolute','right':'0px'}).click(function(){
          $('div:eq(2)', obj).animate({width:0},o.linkDisplaySpeed);
          $('#dragwrapper'+randID).animate({left:'0px'},o.linkDisplaySpeed);
        });
      }

      if(o.enableKeyboard)
      {
        $(document).keydown(function(event){
          if(event.keyCode == 39)
          {
            if( (parseInt($('#dragwrapper'+randID).css('left'))+parseInt($('#dragwrapper'+randID).width()) + o.keypressAmount) <= imgWidth )
            {
              $('#dragwrapper'+randID).css('left', parseInt( $('#dragwrapper'+randID).css('left') ) + o.keypressAmount + 'px');
              $('div:eq(2)', obj).width( parseInt( $('div:eq(2)', obj).width() ) + o.keypressAmount + 'px' );
            }
            else
            {
              $('#dragwrapper'+randID).css('left', imgWidth - parseInt( $('#dragwrapper'+randID).width() ) + 'px');
              $('div:eq(2)', obj).width( imgWidth - parseInt( $('#dragwrapper'+randID).width() )/2 + 'px' );
            }
          }
          if(event.keyCode == 37)
          {
            if( (parseInt($('#dragwrapper'+randID).css('left')) - o.keypressAmount) >= 0 )
            {
              $('#dragwrapper'+randID).css('left', parseInt( $('#dragwrapper'+randID).css('left') ) - o.keypressAmount + 'px');
              $('div:eq(2)', obj).width( parseInt( $('div:eq(2)', obj).width() ) - o.keypressAmount + 'px' );
            }
            else
            {
              $('#dragwrapper'+randID).css('left', '0px');
              $('div:eq(2)', obj).width($('#dragwrapper'+randID).width()/2);
            }
          }
        });
      }

      $('#dragwrapper'+randID).draggable( { containment:obj,drag:drag,stop:drag });

      function drag()
      {
        $('#lt-arrow'+randID+', #rt-arrow'+randID).stop().css('opacity',0);
        $('div:eq(2)', obj).width( parseInt( $(this).css('left') ) + 4 );
      }

      if(o.animateIntro)
      {
        $('div:eq(2)', obj).width(imgWidth);
        $('#dragwrapper'+randID).css('left',imgWidth-($('#dragwrapper'+randID).width()/2)+'px');
        setTimeout(function(){
          $('#dragwrapper'+randID).css({'opacity':1}).animate({'left':(imgWidth*o.introPosition)-($('#dragwrapper'+randID).width()/2)+'px'},o.introDuration,function(){$('#dragwrapper'+randID).animate({'opacity':.25},1000)});
          $('div:eq(2)', obj).width(imgWidth).animate({'width':imgWidth*o.introPosition+'px'},o.introDuration,function(){clickit();o.onReady.call(this);});
        },o.introDelay);
      }
      else
      {
        clickit();
        o.onReady.call(this);
      }

      function clickit()
      {
        $(obj).hover(function(){
            $('#lt-arrow'+randID).stop().css({'z-index':'20','position':'absolute','top':imgHeight/2-$('#lt-arrow'+randID).height()/2+'px','left':parseInt($('#dragwrapper'+randID).css('left'))-10+'px'}).animate({opacity:1,left:parseInt($('#lt-arrow'+randID).css('left'))-6+'px'},200);
            $('#rt-arrow'+randID).stop().css({'position':'absolute','top':imgHeight/2-$('#lt-arrow'+randID).height()/2+'px','left':parseInt($('#dragwrapper'+randID).css('left'))+10+'px'}).animate({opacity:1,left:parseInt($('#rt-arrow'+randID).css('left'))+6+'px'},200);
            $('#dragwrapper'+randID).animate({'opacity':1},200);
          },function(){
            $('#lt-arrow'+randID).animate({opacity:0,left:parseInt($('#lt-arrow'+randID).css('left'))-6+'px'},350);
            $('#rt-arrow'+randID).animate({opacity:0,left:parseInt($('#rt-arrow'+randID).css('left'))+6+'px'},350);
            $('#dragwrapper'+randID).animate({'opacity':.25},350);
          }
        );

        // When clicking in the container, move the bar and imageholder divs
        $(obj).click(function(e){
          var clickX = e.pageX - $(this).offset().left;
          $('#dragwrapper'+randID).stop().animate({'left':clickX-($('#dragwrapper'+randID).width()/2)+'px'},o.clickSpeed);
          $('div:eq(2)', obj).stop().animate({'width':clickX+'px'},o.clickSpeed);
          $('#lt-arrow'+randID+',#rt-arrow'+randID).stop().animate({opacity:0},50);
        });
        $(obj).one('mousemove', function(){$('#dragwrapper'+randID).stop().animate({'opacity':1},500);}); // If the mouse is over the container and we animate the intro, we run this to change the opacity when the mouse moves since the hover event doesnt get triggered yet
      }
      });
      }
  });
})(jQuery);

$(function(){
  $('#container').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container1').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container2').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container3').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container4').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container5').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
  $('#container6').beforeAfter({imagePath:'/jquery/beforeafter/js/'});
});

var Menu = {

  el: {
    ham: $('.hamburger'),
    menuTop: $('.menu-top'),
    menuMiddle: $('.menu-middle'),
    menuBottom: $('.menu-bottom')
  },

  init: function() {
    Menu.bindUIactions();
  },

  bindUIactions: function() {
    Menu.el.ham
        .on(
          'click',
        function(event) {
        Menu.activateMenu(event);
        event.preventDefault();
      }
    );
  },

  activateMenu: function() {
    Menu.el.menuTop.toggleClass('menu-top-click');
    Menu.el.menuMiddle.toggleClass('menu-middle-click');
    Menu.el.menuBottom.toggleClass('menu-bottom-click');
  }
};

Menu.init();
