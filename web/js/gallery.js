// Simple gallery lightbox (vanilla JS)
(function(){
  function byId(id){return document.getElementById(id)}
  var lightbox, imgEl, prevBtn, nextBtn, closeBtn, imgs = [], current = 0
  function init(){
    lightbox = byId('lightbox')
    if(!lightbox) return
    imgEl = lightbox.querySelector('img')
    prevBtn = byId('lb-prev')
    nextBtn = byId('lb-next')
    closeBtn = byId('lb-close')

    // create zoom controls container (placed as child of lightbox so buttons sit outside the image area)
    if(!byId('lb-zoom-in')){
      var zoomWrap = lightbox.querySelector('.zoom-controls')
      if(!zoomWrap){ zoomWrap = document.createElement('div'); zoomWrap.className = 'zoom-controls'; lightbox.appendChild(zoomWrap) }
      var zin = document.createElement('button'); zin.type='button'; zin.id='lb-zoom-in'; zin.textContent='+'; zin.title='放大'
      var zout = document.createElement('button'); zout.type='button'; zout.id='lb-zoom-out'; zout.textContent='-'; zout.title='缩小'
      var rset = document.createElement('button'); rset.type='button'; rset.id='lb-zoom-reset'; rset.textContent='原始'; rset.title='重置'
      zoomWrap.appendChild(zin); zoomWrap.appendChild(rset); zoomWrap.appendChild(zout)
    }

    var zinBtn = byId('lb-zoom-in')
    var zoutBtn = byId('lb-zoom-out')
    var rsetBtn = byId('lb-zoom-reset')

    document.querySelectorAll('.gallery-grid a').forEach(function(a, i){
      var im = a.querySelector('img')
      imgs.push({src: a.href, alt: im && im.alt})
      a.addEventListener('click', function(e){
        e.preventDefault(); open(i)
      })
    })

    prevBtn && prevBtn.addEventListener('click', prev)
    nextBtn && nextBtn.addEventListener('click', next)
    closeBtn && closeBtn.addEventListener('click', close)
    zinBtn && zinBtn.addEventListener('click', function(e){ e.stopPropagation(); zoomBy(0.25) })
    zoutBtn && zoutBtn.addEventListener('click', function(e){ e.stopPropagation(); zoomBy(-0.25) })
    rsetBtn && rsetBtn.addEventListener('click', function(e){ e.stopPropagation(); resetZoom() })

    // robust event delegation on nav: catch clicks even if buttons are replaced
    var navEl = lightbox.querySelector('.nav') || lightbox
    navEl.addEventListener('click', function(e){
      var id = (e.target && e.target.id) || ''
      if(!id) return
      if(id==='lb-prev') { e.stopPropagation(); prev(); }
      else if(id==='lb-next') { e.stopPropagation(); next(); }
      else if(id==='lb-close') { e.stopPropagation(); close(); }
      else if(id==='lb-zoom-in') { e.stopPropagation(); zoomBy(0.25); }
      else if(id==='lb-zoom-out') { e.stopPropagation(); zoomBy(-0.25); }
      else if(id==='lb-zoom-reset') { e.stopPropagation(); resetZoom(); }
    })

    lightbox.addEventListener('click', function(e){ if(e.target===lightbox) close() })

    // keyboard handling: be robust across browsers and platforms
    function debugKey(e){
      try{ console.log('gallery key event', {type: e.type, key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey}) }catch(err){}
    }

    function handleKeyDown(e){
      if(!lightbox.classList.contains('active')) return
      debugKey(e)
      // prefer numeric keyCode for compatibility, fall back to e.key
      var kc = e.keyCode || e.which || 0
      var k = (typeof e.key === 'string' && e.key) || ''

      // numeric codes: 27=Esc,37=Left,39=Right,187/61/107='+'/'=', 189/109='-'
      if(kc===27 || k==='Escape' || k==='Esc') { e.preventDefault(); close(); return }
      if(kc===37 || k==='ArrowLeft' || k==='Left') { e.preventDefault(); prev(); return }
      if(kc===39 || k==='ArrowRight' || k==='Right') { e.preventDefault(); next(); return }
      if(kc===187 || kc===61 || kc===107 || k==='+' || k==='Equal') { e.preventDefault(); zoomBy(0.25); return }
      if(kc===189 || kc===109 || k==='-' || k==='Minus') { e.preventDefault(); zoomBy(-0.25); return }
    }

    // handle printable characters (keypress) for some older browsers / IME cases
    function handleKeyPress(e){
      if(!lightbox.classList.contains('active')) return
      debugKey(e)
      var ch = String.fromCharCode(e.which || e.keyCode || 0)
      if(ch === '+') { e.preventDefault(); zoomBy(0.25); }
      if(ch === '-') { e.preventDefault(); zoomBy(-0.25); }
    }

    // listen on document and window to increase likelihood of capturing events
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keypress', handleKeyPress, true)
    window.addEventListener('keydown', handleKeyDown, true)

    // make lightbox focusable and focus when opened
    lightbox.setAttribute('tabindex', '0')

    // initial scale config: 'fit' (fit to container) or 'fixed' (use fixed initial scale)
    var initialMode = 'fit' // 'fit' or 'fixed'
    var initialFixedScale = 0.2 // used when initialMode === 'fixed'
    var initialFitScale = 0.2 // multiplier applied to fit-to-container scale

    // zoom / pan state
    var state = {scale:1, tx:0, ty:0, min:0.1, max:5}
    var pointers = {} // for pinch
    var lastPan = null

    function applyTransform(noClamp){
      imgEl.style.transform = 'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.scale + ')'
      if(!noClamp) clampPan()
    }

    function resetZoom(){ state.scale=1; state.tx=0; state.ty=0; applyTransform(); }
    function zoomTo(s, cx, cy){
      s = Math.max(state.min, Math.min(state.max, s))
      // translate to keep cx/cy stable
      var rect = imgEl.getBoundingClientRect()
      var dx = cx - rect.left, dy = cy - rect.top
      var relX = dx/rect.width, relY = dy/rect.height
      var newTx = state.tx - (s/state.scale - 1) * (rect.width*relX)
      var newTy = state.ty - (s/state.scale - 1) * (rect.height*relY)
      state.scale = s; state.tx = newTx; state.ty = newTy; applyTransform()
    }
    function zoomBy(delta){ zoomTo(state.scale + delta, window.innerWidth/2, window.innerHeight/2) }

    // wheel zoom
    imgEl.addEventListener('wheel', function(e){
      if(!lightbox.classList.contains('active')) return
      e.preventDefault()
      var delta = -e.deltaY * 0.0015
      zoomTo(state.scale * (1 + delta), e.clientX, e.clientY)
    }, {passive:false})

    // double click to toggle (clear single-click timer)
    var _clickTimer = null
    imgEl.addEventListener('dblclick', function(e){
      if(_clickTimer){ clearTimeout(_clickTimer); _clickTimer = null }
      if(state.scale>1.1) resetZoom(); else zoomTo(2.5, e.clientX, e.clientY)
    })

    // single-click: navigate by clicking left/right, middle toggles zoom
    imgEl.addEventListener('click', function(e){
      if(!lightbox.classList.contains('active')) return
      // ignore clicks while dragging
      if(lightbox.classList.contains('dragging')) return
      // use a short delay to allow dblclick to cancel single-click
      if(_clickTimer) clearTimeout(_clickTimer)
      _clickTimer = setTimeout(function(){
        _clickTimer = null
        try{
          var rect = imgEl.getBoundingClientRect()
          var x = e.clientX - rect.left
          var w = rect.width
          // left 0-40% -> prev, right 60-100% -> next, center 40-60% -> toggle zoom/reset
          if(x < w*0.4) prev()
          else if(x > w*0.6) next()
          else {
            if(state.scale>1.1) resetZoom(); else zoomTo(2.2, e.clientX, e.clientY)
          }
        }catch(err){
          // fallback: advance
          next()
        }
      }, 220)
    })

    // pointer events for pan & pinch
    imgEl.style.touchAction = 'none'
    lightbox.addEventListener('pointerdown', function(e){
      if(!lightbox.classList.contains('active')) return
      imgEl.setPointerCapture && imgEl.setPointerCapture(e.pointerId)
      pointers[e.pointerId] = {x:e.clientX, y:e.clientY}
      if(Object.keys(pointers).length===1){ lastPan = {x:e.clientX, y:e.clientY} }
      lightbox.classList.add('dragging')
    })
    lightbox.addEventListener('pointermove', function(e){
      if(!lightbox.classList.contains('active')) return
      if(!(e.pointerId in pointers)) return
      if(Object.keys(pointers).length===1 && state.scale>1){
        var dx = e.clientX - lastPan.x; var dy = e.clientY - lastPan.y
        state.tx += dx; state.ty += dy; lastPan = {x:e.clientX,y:e.clientY}; applyTransform(true);
      } else if(Object.keys(pointers).length===2){
        // pinch: compute scale from two pointers
        pointers[e.pointerId] = {x:e.clientX, y:e.clientY}
        var ids = Object.keys(pointers)
        var p1 = pointers[ids[0]], p2 = pointers[ids[1]]
        var dist = Math.hypot(p2.x-p1.x, p2.y-p1.y)
        if(!lightbox._pinchStart){ lightbox._pinchStart = {dist:dist, scale: state.scale} }
        else{
          var s = lightbox._pinchStart.scale * (dist / lightbox._pinchStart.dist)
          zoomTo(s, (p1.x+p2.x)/2, (p1.y+p2.y)/2)
        }
      }
    })
    lightbox.addEventListener('pointerup', function(e){ delete pointers[e.pointerId]; imgEl.releasePointerCapture && imgEl.releasePointerCapture(e.pointerId); lightbox._pinchStart = null })
    lightbox.addEventListener('pointercancel', function(e){ delete pointers[e.pointerId]; imgEl.releasePointerCapture && imgEl.releasePointerCapture(e.pointerId); lightbox._pinchStart = null })

    // remove dragging state on pointer up/out
    lightbox.addEventListener('pointerup', function(e){
      lightbox.classList.remove('dragging')
      clampPan()
    })
    lightbox.addEventListener('pointercancel', function(e){
      lightbox.classList.remove('dragging')
      clampPan()
    })

    function clampPan(){
      var inner = lightbox.querySelector('.inner') || lightbox
      var crect = inner.getBoundingClientRect()
      var rect = imgEl.getBoundingClientRect()
      var dx = 0, dy = 0
      // horizontally
      if(rect.width <= crect.width){
        // center
        dx = (crect.left + crect.width/2) - (rect.left + rect.width/2)
      } else {
        if(rect.left > crect.left) dx = crect.left - rect.left
        if(rect.right < crect.right) dx = crect.right - rect.right
      }
      // vertically
      if(rect.height <= crect.height){
        dy = (crect.top + crect.height/2) - (rect.top + rect.height/2)
      } else {
        if(rect.top > crect.top) dy = crect.top - rect.top
        if(rect.bottom < crect.bottom) dy = crect.bottom - rect.bottom
      }
      if(Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5){
        state.tx += dx; state.ty += dy
        imgEl.style.transition = 'transform .18s ease'
        imgEl.style.transform = 'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.scale + ')'
        // clear transition after small delay
        setTimeout(function(){ imgEl.style.transition = 'transform .18s ease' }, 220)
      }
    }

    // reset transform when image changes / opened
    var origShow = show
    // keep origShow but don't forcibly reset; initial scale will be applied on image load
    show = function(){ origShow(); }
  }

  function open(index){ current = index; show(); lightbox.classList.add('active'); try{ setTimeout(function(){ lightbox.focus && lightbox.focus() }, 50) }catch(e){} }
  function close(){ lightbox.classList.remove('active'); imgEl.src = '' }
  function show(){
    var it = imgs[current];
    imgEl.alt = it.alt || ''
    // apply initial scale after image has loaded so naturalWidth/naturalHeight are available
    imgEl.onload = function(){
      try{
        var inner = lightbox.querySelector('.inner') || lightbox
        var crect = inner.getBoundingClientRect()
        var natW = imgEl.naturalWidth || imgEl.width || crect.width
        var natH = imgEl.naturalHeight || imgEl.height || crect.height
        var fit = Math.min(crect.width / Math.max(1, natW), crect.height / Math.max(1, natH))
        if(initialMode === 'fixed'){
          state.scale = Math.max(state.min, Math.min(state.max, initialFixedScale))
        } else {
          state.scale = Math.max(state.min, Math.min(state.max, fit * initialFitScale))
        }
        state.tx = 0; state.ty = 0
        applyTransform()
      }catch(err){
        // fallback: reset to 1
        resetZoom()
      }
    }
    imgEl.src = it.src
  }
  function prev(){ current = (current-1+imgs.length) % imgs.length; show() }
  function next(){ current = (current+1) % imgs.length; show() }

  window.gallery = {init:init, open:open, next:next, prev:prev, close:close}
  document.addEventListener('DOMContentLoaded', init)
})();

// 优化相册翻页按钮和返回相册总览按钮
function init() {
  lightbox = byId('lightbox')
  if(!lightbox) return
  imgEl = lightbox.querySelector('img')
  prevBtn = byId('lb-prev')
  nextBtn = byId('lb-next')
  closeBtn = byId('lb-close')

  // 增强翻页按钮 - 更现代、更易交互的设计
  if(prevBtn) {
    prevBtn.innerHTML = '&#8592;'; // 使用更清晰的箭头图标
    prevBtn.setAttribute('aria-label', '上一张');
    
    // 现代化按钮样式
    Object.assign(prevBtn.style, {
      width: '56px',
      height: '56px',
      fontSize: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'absolute',
      left: '24px',
      top: '50%',
      transform: 'translateY(-50%) scale(1)',
      zIndex: '10',
      touchAction: 'manipulation',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      userSelect: 'none',
      opacity: '0.85'
    });
  }
  
  if(nextBtn) {
    nextBtn.innerHTML = '&#8594;'; // 使用更清晰的箭头图标
    nextBtn.setAttribute('aria-label', '下一张');
    
    // 现代化按钮样式
    Object.assign(nextBtn.style, {
      width: '56px',
      height: '56px',
      fontSize: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'absolute',
      right: '24px',
      top: '50%',
      transform: 'translateY(-50%) scale(1)',
      zIndex: '10',
      touchAction: 'manipulation',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      userSelect: 'none',
      opacity: '0.85'
    });
  }
  
  // 增强关闭按钮
  if(closeBtn) {
    closeBtn.innerHTML = '&#10005;'; // 使用更现代的关闭图标
    closeBtn.setAttribute('aria-label', '关闭');
    
    Object.assign(closeBtn.style, {
      width: '44px',
      height: '44px',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: '11',
      touchAction: 'manipulation',
      outline: 'none',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
    });
  }
  
  // 统一的悬停和点击效果
  const enhanceButtonInteractions = (button) => {
    if (!button) return;
    
    // 悬停效果（桌面设备）
    button.addEventListener('mouseenter', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(1.1)' 
        : 'scale(1.1)';
      this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
      this.style.opacity = '1';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(1)' 
        : 'scale(1)';
      this.style.boxShadow = button.id.includes('close') 
        ? '0 2px 8px rgba(0, 0, 0, 0.3)'
        : '0 4px 12px rgba(0, 0, 0, 0.3)';
      this.style.opacity = '0.85';
    });
    
    // 点击效果
    button.addEventListener('mousedown', function() {
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(0.95)' 
        : 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', function() {
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(1.1)' 
        : 'scale(1.1)';
    });
    
    // 移动设备触摸效果
    button.addEventListener('touchstart', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(0.95)' 
        : 'scale(0.95)';
    });
    
    button.addEventListener('touchend', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      this.style.transform = button.id.includes('prev') || button.id.includes('next') 
        ? 'translateY(-50%) scale(1)' 
        : 'scale(1)';
    });
    
    // 键盘聚焦效果
    button.addEventListener('focus', function() {
      this.style.outline = '2px solid #4a90e2';
      this.style.outlineOffset = '2px';
    });
    
    button.addEventListener('blur', function() {
      this.style.outline = 'none';
      this.style.outlineOffset = '0';
    });
  };
  
  // 应用增强效果到所有按钮
  enhanceButtonInteractions(prevBtn);
  enhanceButtonInteractions(nextBtn);
  enhanceButtonInteractions(closeBtn);
  
  // 为移动设备添加更大的触摸区域
  if ('ontouchstart' in window || navigator.maxTouchPoints) {
    const createTouchTarget = (btn) => {
      if (!btn) return;
      
      // 创建触摸区域容器
      const touchArea = document.createElement('div');
      touchArea.style.position = 'absolute';
      touchArea.style.width = '80px';
      touchArea.style.height = '80px';
      touchArea.style.cursor = 'pointer';
      touchArea.style.zIndex = '9';
      touchArea.style.borderRadius = '50%';
      touchArea.style.display = 'flex';
      touchArea.style.alignItems = 'center';
      touchArea.style.justifyContent = 'center';
      
      // 设置位置
      if (btn.id === 'lb-prev') {
        touchArea.style.left = '8px';
      } else if (btn.id === 'lb-next') {
        touchArea.style.right = '8px';
      }
      
      if (btn.id === 'lb-prev' || btn.id === 'lb-next') {
        touchArea.style.top = '50%';
        touchArea.style.transform = 'translateY(-50%)';
      }
      
      // 重新定位按钮
      const parent = btn.parentNode;
      parent.insertBefore(touchArea, btn);
      parent.removeChild(btn);
      touchArea.appendChild(btn);
      
      // 居中按钮
      btn.style.position = 'absolute';
      btn.style.left = '50%';
      btn.style.top = '50%';
      btn.style.transform = 'translate(-50%, -50%) scale(1)';
      
      // 点击触摸区域触发按钮点击
      touchArea.addEventListener('click', function() {
        btn.click();
      });
      
      // 触摸反馈
      touchArea.addEventListener('touchstart', function() {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      });
      
      touchArea.addEventListener('touchend', function() {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      });
    };
    
    createTouchTarget(prevBtn);
    createTouchTarget(nextBtn);
    
    // 关闭按钮触摸优化
    if (closeBtn) {
      const closeTouchArea = document.createElement('div');
      closeTouchArea.style.position = 'absolute';
      closeTouchArea.style.width = '60px';
      closeTouchArea.style.height = '60px';
      closeTouchArea.style.cursor = 'pointer';
      closeTouchArea.style.zIndex = '10';
      closeTouchArea.style.borderRadius = '50%';
      closeTouchArea.style.display = 'flex';
      closeTouchArea.style.alignItems = 'center';
      closeTouchArea.style.justifyContent = 'center';
      closeTouchArea.style.top = '12px';
      closeTouchArea.style.right = '12px';
      
      const parent = closeBtn.parentNode;
      parent.insertBefore(closeTouchArea, closeBtn);
      parent.removeChild(closeBtn);
      closeTouchArea.appendChild(closeBtn);
      
      // 居中关闭按钮
      closeBtn.style.position = 'absolute';
      closeBtn.style.left = '50%';
      closeBtn.style.top = '50%';
      closeBtn.style.transform = 'translate(-50%, -50%)';
      
      // 点击事件传递
      closeTouchArea.addEventListener('click', function() {
        closeBtn.click();
      });
    }
  }
  
  // 响应式设计 - 根据屏幕大小调整按钮
  const adjustButtonsForScreen = () => {
    const isMobile = window.innerWidth < 768;
    const buttonSize = isMobile ? '48px' : '56px';
    const fontSize = isMobile ? '20px' : '24px';
    const closeSize = isMobile ? '36px' : '44px';
    const closeFontSize = isMobile ? '18px' : '20px';
    const buttonPos = isMobile ? '16px' : '24px';
    
    if (prevBtn) {
      prevBtn.style.width = buttonSize;
      prevBtn.style.height = buttonSize;
      prevBtn.style.fontSize = fontSize;
      prevBtn.style.left = buttonPos;
    }
    
    if (nextBtn) {
      nextBtn.style.width = buttonSize;
      nextBtn.style.height = buttonSize;
      nextBtn.style.fontSize = fontSize;
      nextBtn.style.right = buttonPos;
    }
    
    if (closeBtn) {
      closeBtn.style.width = closeSize;
      closeBtn.style.height = closeSize;
      closeBtn.style.fontSize = closeFontSize;
    }
  };
  
  // 初始调整并监听窗口大小变化
  adjustButtonsForScreen();
  window.addEventListener('resize', adjustButtonsForScreen);
  
  // 其余原有代码保持不变...
  // ... existing code ...
}

// 优化返回相册总览按钮
(function(){
  // 简单检查DOM是否已加载
  function isDomReady() {
    return document.readyState === 'complete' || document.readyState === 'interactive';
  }
  
  // 等待DOM加载完成的函数
  function onDomReady(callback) {
    if (isDomReady()) {
      callback();
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }
  
  // 创建并设置返回相册总览按钮
  function createBackToGalleryButton() {
    // 移除已存在的按钮
    const existingButton = document.getElementById('back-to-top');
    if (existingButton) {
      existingButton.remove();
    }
    
    // 创建新按钮
    const button = document.createElement('button');
    button.id = 'back-to-top';
    button.className = 'back-to-top';
    button.type = 'button';
    button.title = '返回相册总览';
    button.setAttribute('aria-label', '返回相册总览');
    
    // 创建图标和文字的组合
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 11V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v8c0 .55.45 1 1 1s1-.45 1-1V4c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v7c0 .55.45 1 1 1s1-.45 1-1zM8.5 21c.83 0 1.5-.67 1.5-1.5S9.33 18 8.5 18s-1.5.67-1.5 1.5S7.67 21 8.5 21zm7 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM5 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm3.5 7c-.83 0-1.5-.67-1.5-1.5S7.67 17 8.5 17s1.5.67 1.5 1.5S9.33 20 8.5 20zm7-1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
      <span>相册</span>
    `;
    
    // 现代化按钮样式
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation',
      zIndex: '99999',
      outline: 'none',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      userSelect: 'none',
      opacity: '0.9'
    });
    
    // 调整内部元素样式
    const svg = button.querySelector('svg');
    const span = button.querySelector('span');
    
    if (svg) {
      svg.style.marginBottom = '2px';
    }
    
    if (span) {
      span.style.fontSize = '12px';
      span.style.fontWeight = '500';
      span.style.lineHeight = '1';
    }
    
    // 添加点击事件 - 跳转到相册总览页面
    button.onclick = function() {
      // 添加点击动画效果
      this.style.transform = 'scale(0.9)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
        window.location.href = './xiangce.htm';
      }, 150);
    };
    
    // 增强的悬停和触摸效果
    button.addEventListener('mouseenter', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      this.style.transform = 'scale(1.08) translateY(-2px)';
      this.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
      this.style.opacity = '1';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.style.transform = 'scale(1) translateY(0)';
      this.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
      this.style.opacity = '0.9';
    });
    
    button.addEventListener('mousedown', function() {
      this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', function() {
      this.style.transform = 'scale(1.08) translateY(-2px)';
    });
    
    // 移动设备触摸效果
    button.addEventListener('touchstart', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', function() {
      this.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.style.transform = 'scale(1)';
    });
    
    // 键盘聚焦效果
    button.addEventListener('focus', function() {
      this.style.outline = '2px solid #4a90e2';
      this.style.outlineOffset = '2px';
    });
    
    button.addEventListener('blur', function() {
      this.style.outline = 'none';
    });
    
    // 响应式设计
    const adjustBackButtonForScreen = () => {
      const isMobile = window.innerWidth < 768;
      const buttonSize = isMobile ? '56px' : '64px';
      const fontSize = isMobile ? '11px' : '12px';
      const svgSize = isMobile ? '20' : '24';
      const buttonPos = isMobile ? '16px' : '24px';
      
      button.style.width = buttonSize;
      button.style.height = buttonSize;
      button.style.bottom = buttonPos;
      button.style.right = buttonPos;
      
      if (span) {
        span.style.fontSize = fontSize;
      }
      
      if (svg) {
        svg.setAttribute('width', svgSize);
        svg.setAttribute('height', svgSize);
      }
    };
    
    // 初始调整并监听窗口大小变化
    adjustBackButtonForScreen();
    window.addEventListener('resize', adjustBackButtonForScreen);
    
    // 添加到页面并使用淡入动画
    document.body.appendChild(button);
    button.style.opacity = '0';
    button.style.transform = 'translateY(20px) scale(0.8)';
    
    setTimeout(() => {
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(0) scale(1)';
    }, 100);
  }
  
  // 当DOM准备好时创建按钮
  onDomReady(createBackToGalleryButton);
})();