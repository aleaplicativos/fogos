const canv=document.getElementById("firework-area"),
      ctx=canv.getContext("2d"),
      body=document.body,
      timeStep=0.1,
      masterKeys=[
        ["x","y","color","angle","strength","time"],
        ["x","y","color","angle","strength","time"],
        ["x","y","color","strength","time"],
        ["x","y","angle","strength","time"]
      ];
var editMode="cursor",
    prevMode="cursor",
    fwMode=0,
    coords=[0,0],
    curCoords=[0,0],
    curCoordsDiscrete=[0,0],
    drawing=false,
    activeFW=null,
    fireworks=[],
    queue=new TimeQueue(1000*timeStep),
    engine=new FireworkEngine(),
    time=0,
    rad=10,
    cHeight=0,
    period={
      start: 0,
      end: 15
    };

/*  PARAMETERS:
*   1. coordinates: x:64, y: 32
*   2. color: 30
*   3. angle: 33
*   4. strength: 16
*   5. time: Infinity
*/

/*  URL EXAMPLE:
*   ?show=[type][coordinates][color][angle][strength][time]-[type][coordinates][color][strength][time]
*/

function initFW(type,vals){
  var fw={type: type},
      keys=masterKeys[type];
  for (var i=0;i<keys.length;i++)
    fw[keys[i]]=vals[i];
  return fw;
}

function encodeDataStr(obj){
  return obj.type+multiEncode(obj,masterKeys[obj.type]);
}
  
function multiEncode(obj,keys){
  var out="";
  for (var i=0;i<keys.length;i++)
    out+=b64Encode(obj[keys[i]]);
  return out;
}

function decodeDataStr(str){
  return initFW(parseInt(str[0]),multiDecode(str,masterKeys[type]));
}

function multiDecode(str,keys){
  var offs=1,
      out=[];
  for (var i=0;i<keys.length-1;i++){
    var val=b64Decode(str.substr(offs,1));
    out.push(val);
    if (obj)
      obj[keys[i]]=val;
    offs++;
  }
  out.push(b64Decode(str.substr(offs)));
  if (obj)
    obj.time=val;
  return out;
}

function move(evt){
  coords=getCoords(evt);
  if (!drawing)
    moveSpot(evt);
  switch (editMode){
    case "fw-set":
      if (drawing){
        setSet(coords);
        paintSet(); 
      }
      break;
    case "drag":
      moveSet(evt);
      break;
    case "slide":
      dragSlider(evt);
      break;
  }
}

function down(evt){
  var vp=validPress(evt);
  if (editMode=="cursor"&&vp){
    addFW();
    setEditMode("fw-set");
    setDrawing(true);
    paintSet();
  }else if(editMode=="fw-set"&&vp)
    setEditMode("cursor");
}

function up(evt){
  var vp=validPress(evt);
  switch (editMode){
    case "fw-set":
      setDrawing(false);
      break;
    case "drag":
      setEditMode("fw-set");
      break;
    case "slide":
      setEditMode(prevMode);
      break;
  }
}

function globalKeys(evt){
  switch (evt.which){
    case 46:
      if (activeFW)
        remFW(activeFW);
      break;
    case 27:
      setEditMode("cursor");
  }
}

function validPress(evt){
  return evt.target.id=="grid";
  //return !(getParent(evt.target,"fw-box")||getParent(evt.target,"fw-icon-rect")||getParent(evt.target,"fw-icon-dot"));
}

function addFW(){
  var fw=null,
      x=curCoordsDiscrete[0]-1,
      y=curCoordsDiscrete[1]-1;
  switch (fwMode){
    case 0:
      fw=initFW(0,[x,y,18,16,1,time]);
      break;
    case 1:
      fw=initFW(1,[x,y,18,16,1,time]);
      break;
    case 2:
      fw=initFW(2,[x,y,18,1,time]);
      break;
    case 3:
      fw=initFW(3,[x,y,16,1,time]);
      break;
  }
  fireworks.push(fw);
  queue.add(time*1000,fw,function(){
    engine.fire(fw);
  });
  activeFW=fw;
}

function remFW(fw){
  for (var i=0;i<fireworks.length;i++){
    if (fireworks[i]==fw){
      fireworks.splice(i,1);
      break;
    }
  }
  queue.remove(fw);
  setEditMode("cursor");
  paintIcons();
}
  
function getCoords(evt){
  var p=(evt.touches || [evt])[0];
  return [p.clientX,p.clientY];
}

function getCoordsDiscrete(evt){
   var coords=getCoords(evt),
       h=cHeight/33,
       w=window.innerWidth/64,
       x=Math.min(Math.max(Math.round(coords[0]/w),1),63),
       y=Math.min(Math.max(Math.round(coords[1]/h),1),32)
   return {
     x: x,
     y: y,
     sX: x*w,
     sY: y*h
   };
}

function moveSpot(evt){
  var p=getCoordsDiscrete(evt),
      cur=document.getElementById("cursor"),
      oppo=document.getElementById("opposite"),
      x=p.x,
      y=p.y,
      invalid=inRect(p.sX,p.sY,document.getElementById("fw-box"))||!validPress(evt);
  
  if (activeFW&&invalid)
    p=getPoint(activeFW);
  oppo.setAttribute("cx",window.innerWidth-p.sX);
  oppo.setAttribute("cy",p.sY);
  
  if (invalid){
    cur.style.display="none";
    return null;
  }
  
  cur.style.display="";
  cur.setAttribute("cx",p.sX);
  cur.setAttribute("cy",p.sY);
  curCoords=[p.sX,p.sY];
  curCoordsDiscrete=[x,y];
  return [x-1,y-1];
}

function moveSet(evt){
  var p=getCoordsDiscrete(evt);
  activeFW.x=p.x-1;
  activeFW.y=p.y-1;
  paintSet(true);
}

function setSet(c){
  var af=activeFW,
      cX=getPoint(af).x,
      cY=getPoint(af).y,
      r=Math.hypot(c[0]-cX,c[1]-cY)-rad,
      ang=Math.round(Math.atan2(cY-c[1],cX-c[0])/Math.PI*32);
  if (ang<0)
    ang=ang<-16?32:0;
  af.strength=Math.max(Math.min(Math.floor(r/rad),16),1);
  if (af.hasOwnProperty("angle"))
    af.angle=ang;
}

function paintSet(noRot){
  if (!activeFW)
    return;
  var g=document.getElementById("adv-cursor"),
      oppo=document.getElementById("opposite"),
      af=activeFW,
      cX=getPoint(af).x,
      cY=getPoint(af).y,
      col=condSet(af.color,3),
      r=(af.strength+1)*rad,
      ang=((af.angle || 0)/32)*Math.PI,
      drag=null,
      move=null;
  
  oppo.setAttribute("cx",window.innerWidth-cX);
  oppo.setAttribute("cy",cY);
  
  clearSVG(g);
  
  switch (activeFW.type){
    case 0:
    case 1:
    case 3:
      genSVG("path",{d: format("M{0} {1} a{2} {2} 180 1 1 {3} 0",cX-r,cY,r,r*2), fill: getHSLA(col,50,0.3), stroke: getHSLA(col,50,0.7)},"arc",g);
      genSVG("path",{d: format("M{0} {1} l{2} {3}",cX,cY,-Math.cos(ang)*r,-Math.sin(ang)*r), stroke: getHSL(col)},"radius",g);
      drag=genSVG("circle",{cx: cX-Math.cos(ang)*r, cy: cY-Math.sin(ang)*r, r: rad, fill: getHSL(col)},"spinner-drag",g);
      move=drawRotRect(af,{fill: getHSL(col)},g);
      break;
    case 2:
      genSVG("circle",{cx: cX, cy: cY, r: r, fill: getHSLA(col,50,0.3), stroke: getHSL(col)},"spinner-circle",g);
      var ang=noRot?Math.PI/2:Math.atan2(cY-coords[1],cX-coords[0]);
      drag=genSVG("circle",{cx: cX-Math.cos(ang)*r, cy: cY-Math.sin(ang)*r, r: rad, fill: getHSL(col)},"spinner-drag",g);
      move=genSVG("circle",{cx: cX, cy: cY, r: 5, fill: getHSL(col)},"center-dot",g);
      break;
  }
  
  drag.addEventListener("mousedown",pickup);
  drag.addEventListener("touchstart",pickup);
  
  move.addEventListener("mousedown",startMove);
  move.addEventListener("touchstart",startMove);
  
  function pickup(evt){
    setDrawing(true);
    evt.stopPropagation();
  }
  
  function startMove(evt){
    setEditMode("drag");
    evt.stopPropagation();
  }
  
  paintIcons();
  setInfoPill();
}

function paintIcons(){
  var g=document.getElementById("fw-icons");
  clearSVG(g);
  for (var i=0;i<fireworks.length;i++){
    (function(id,fw){
      var p=getPoint(fw),
          icon=null;
      if (fw.type==2){
        icon=genSVG("circle",{cx: p.x, cy: p.y, r: 7, fill: "black", stroke: getHSL(fw.color)},"fw-icon-dot-bg",g);
        genSVG("circle",{cx: p.x, cy: p.y, r: 5, fill: getHSL(fw.color)},"fw-icon-dot",g);
      }else{
        var extraClass="";
        switch (fw.type){
          case 1:
            extraClass="dotted";
            break;
          case 3:
            extraClass="dashed";
            break;
        }
        icon=drawRotRect(fw,{fill: "black", stroke: getHSL(condSet(fw.color,3))},g,"fw-icon-rect-bg "+extraClass,2);
        drawRotRect(fw,{fill: getHSL(condSet(fw.color,3))},g,"fw-icon-rect");
      }
      
      icon.onclick=function(){
        activeFW=fw;
        toggleFWMode(fw.type);
        setEditMode("fw-set");
      };
    })(i,fireworks[i]);
  }
}

function drawRotRect(fw,attrs,g,cls,padding){
   var cX=getPoint(fw).x,
       cY=getPoint(fw).y,
       w=rad*1.2+(padding || 0)*2,
       h=rad*2+(padding || 0)*2,
       d="",
       ang=Math.PI-fw.angle*Math.PI/32,
       r=Math.hypot(w/2,h/2),
       angs=[Math.atan2(w,h),Math.atan2(-w,h),Math.atan2(-w,-h),Math.atan2(w,-h)];
  d=format("M{0} {1}",cX-Math.cos(ang+angs[0])*r,cY+Math.sin(ang+angs[0])*r);
  for (var i=1;i<4;i++)
    d+=format(" L{0} {1}",cX-Math.cos(ang+angs[i])*r,cY+Math.sin(ang+angs[i])*r);
  attrs.d=d+" z";
  return genSVG("path",attrs,(cls || "fw-rect"),g);
}

function paintPeriod(){
  setTimeElems();
}

function dragSlider(evt){
  var bcr=document.getElementById("slider").getBoundingClientRect(),
      coords=getCoords(evt),
      left=coords[0]-bcr.left;
  time=Math.round(left/bcr.width*(period.end-period.start)*10)/10+period.start;
  setTimeElems();
}

function setTimeElems(){
  time=Math.max(Math.min(time,period.end),period.start);
  var runner=document.getElementById("slider-runner"),
      to=document.getElementById("time-out"),
      sb=document.getElementsByClassName("step-btn"),
      perc=(time-period.start)/(period.end-period.start);
  to.innerHTML=secToMin(time)+" / "+secToMin(period.end);
  runner.style.left=perc*100+"%";
  
  if (time==period.start)
    sb[0].classList.add("disabled");
  else
    sb[0].classList.remove("disabled");
  
  if (time==period.end)
    sb[1].classList.add("disabled");
  else
    sb[1].classList.remove("disabled");
}

function secToMin(s){
  var out=fillZeroes(Math.floor(s/60))+":";
  s%=60;
  out+=fillZeroes(Math.floor(s))+".";
  return out+Math.floor(s%1*10);
}

function fillZeroes(val){
  if (!val)
    return "00";
  if (val<10)
    return "0"+val;
  return ""+val;
}
    
function getPoint(fw){
  var x=(fw.x+1)*window.innerWidth/64,
      y=(fw.y+1)*cHeight/33;
  return {
    x: x,
    y: y,
    sX: x,
    sY: y
  };
}

function format(str){
  for (var i=1;i<arguments.length;i++){
    var reg=new RegExp("\\{"+(i-1)+"\\}","g");
    str=str.replace(reg,arguments[i].toString());
  }
  return str;
}

function genSVG(tag,attrs,cls,par){
  var e=document.createElementNS("http://www.w3.org/2000/svg",tag);
  if (attrs){
    for (var key in attrs)
      e.setAttribute(key,attrs[key]);
  }
  if (cls)
    e.setAttribute("class",cls);
  if (par)
    par.appendChild(e);
  return e;
}

function clearSVG(elem){
  var ch=elem.childNodes;
  while (ch[0])
    elem.removeChild(ch[0]);
}

function setEditMode(mode,noAttr){
  if (mode!=editMode)
    prevMode=editMode
  editMode=mode;
  if (!noAttr){
    body.setAttribute("data-mode",mode);
    body.classList.remove("show-info-pill");
  }
  switch (mode){
    case "cursor":
      setDrawing(false);
      activeFW=null;
      break;
    case "fw-set":
      paintSet();
      body.classList.add("show-info-pill");
      break;
    case "drag":
      body.classList.add("show-info-pill");
      break;
  }
  setThatMFingGrid();
}

function setDrawing(draw){
  drawing=draw;
  if (drawing)
    body.classList.add("drawing");
  else
    body.classList.remove("drawing");
}

function toggleColSel(off,evt){
  var cs=document.getElementById("color-selector").parentElement;
  if (off||cs.classList.contains("active"))
    cs.classList.remove("active");
  else
    cs.classList.add("active");
  if (evt)
    evt.stopPropagation();
}

function toggleFWMode(id){
  var fi=document.getElementsByClassName("fw-item");
  for (var i=0;i<fi.length;i++){
    fi[i].classList.remove("active");
    if (i==id)
      fi[i].classList.add("active");
  }
  fwMode=id;
}

function setInfoPill(){
  var cc=document.getElementById("current-col"),
      ang=document.getElementById("ang"),
      af=activeFW;
  
  cc.parentElement.parentElement.style.display=af.type==3?"none":"";
  if (af.type!=3)
    cc.style.background=getHSL(af.color);
  
  document.getElementById("strength").innerHTML=af.strength;
  ang.parentElement.style.display=af.type==2?"none":"";
  if (af.type!=2)
    ang.innerHTML=Math.round((af.angle-16)*5.625)+"&deg;";
  
  document.getElementById("x-coord").innerHTML=af.x+1;
  document.getElementById("y-coord").innerHTML=af.y+1;
}

//"Backend work" JS

function b64Encode(val){
  var out="";
  while (true){
    out=conv(val%64)+out;
    val=Math.floor(val/64);
    if (val==0)
      break;
  }
  
  function conv(v){
    if (v<26)
      return String.fromCharCode(97+v);
    if (v<52)
      return String.fromCharCode(39+v);
    if (v<62)
      return ""+(v-52);
    return v==62?"+":"/";
  }
  
  return out;
}

function b64Decode(str){
  var magnitude=1,
      out=0;
  
  for (var i=str.length-1;i>=0;i--){
    out+=conv(str[i])*magnitude;
    magnitude*=64;
  }
  
  function conv(c){
    var v=c.charCodeAt(0);
    if (v>=97&&v<=122)
      return v-97;
    if (v>=65&&v<=90)
      return v-39;
    if (v>=48&&v<=57)
      return v+4;
    return v==43?62:63;
  }
  
  return out;
}

function inRect(x,y,elem){
  var box=elem.getBoundingClientRect();
  return x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom;
}

function getParent(elem,cls){
  while (true){
    if (!elem||elem==document.documentElement)
      return null;
    else if (elem.classList.contains(cls))
      return elem;
    elem=elem.parentElement;
  }
}

//Queue with a specific property. When fed to a special function, it executes the bound function according to the time it was added. This is prettier, more reliable, and less processing intensive than just creating a lot of timeouts.

//Resolution: milliseconds/time point
function TimeQueue(resolution){
  this.queue=[];
  this.pointer=0;
  this.counter=0;
  this.res=resolution;
  this.thread=null;
  this.running=false;
  
  this.add=function(time,ref,callback){
    time=Math.max(Math.round(time/this.res),0);
    var item={
        time: time,
        ref: ref,
        callback: callback
      },
      len=this.queue.length;
    
    for (var i=0;i<len;i++){
      if (this.queue[i].time>time){
        this.queue.splice(Math.max(i-1,0),0,item);
        return;
      }
    }
    
    this.queue.push(item);
  };
  
  this.remove=function(ref){
    for (var i=0;i<this.queue.length;i++){
      if (this.queue[i].ref==ref){
        this.queue.splice(i,1);
        break;
      }
    }
  };
  
  this.step=function(){
    while (true){
      var item=this.queue[this.pointer];
      if (item&&item.time==this.counter){
        item.callback();
        this.pointer++;
      }else if(!item){
        clearInterval(this.thread);
        this.running=false;
        break;
      }else
        break;
    }
    this.counter++;
  };
  
  this.run=function(){
    clearInterval(this.thread);
    var tq=this;
    this.thread=setInterval(function(){tq.step()},this.res);
    this.running=true;
    this.step();
  };
  
  this.stop=function(){
    clearInterval(this.thread);
    this.running=false;
  };
  
  this.restart=function(){
    this.counter=0;
    this.pointer=0;
    this.run();
  };
}

//Firework engine
function FireworkEngine(){
  var fwStack=[],
      thread=null;
  
  this.play=function(){
    fwStack=[];
    thread=setInterval(animFireworks,25);
  };
  
  this.pause=function(){
    clearInterval(thread);
  }
  
  this.fire=function(data){
    var p=getPoint(data);
    switch (data.type){
      case 0:
        var callback=function(x,y,lvl){
              addFireworkShower(x,y,lvl,data);
            },
            dxdy=angToDxDy(data);
        fwStack.push(new Streamer(p.x,p.y,30,dxdy[0],dxdy[1],callback));
        break;
      case 1:
        break;
      case 2:
        fwStack.push(new Spinner(p.x,p.y,40,colPair(data.color)[0]));
        break;
      case 3:
        var dxdy=angToDxDy(data);
        fwStack.push(new Streamer(p.x,p.y,60,dxdy[0],dxdy[1]));
        break;
    }
  };
  
  function angToDxDy(data){
    var ang=data.angle*Math.PI/32,
        strength=data.strength/16;
    return [-Math.cos(ang)*16*strength,Math.sin(ang)*30*strength];
  }
  
  function Streamer(x,y,ttl,dx,dy,firework){
    this.x=x;
    this.y=y;
    this.ttl=ttl+20;
    this.dx=dx;
    this.dy=dy;
    this.sin=0;
    this.sparks=[];
    this.offset=0;

    this.paint=function(){
      ctx.strokeStyle="#ffa969";
      var fw=this,
          sp=fw.sparks;
      var ang=Math.atan2(-fw.dy,fw.dx)+Math.PI;
      if (fw.ttl>20){
        for (var i=0;i<5;i++){
          var speed=firework?Math.random()*5+3:Math.random()*10+5;
          var ang2=ang+0.04*i-0.1+Math.sin(fw.sin)*0.05;
          sp.push({
            x:fw.x,
            y:fw.y,
            dx:Math.cos(ang2)*speed,
            dy:Math.sin(ang2)*speed,
            ttl:20,
            col:"hsl("+(Math.floor(Math.random()*30+20))+",100%,"+(Math.floor(Math.random()*50+20))+"%)"
          });
        }
        fw.sin+=1;
      }
      for (var i=fw.offset;i<sp.length;i++){
        if (sp[i].ttl>0){
          if (Math.random()>0.7)
            continue;
          ctx.lineWidth=sp[i].ttl/20;
          ctx.strokeStyle=sp[i].col;
          ctx.beginPath();
          ctx.moveTo(sp[i].x,sp[i].y);
          sp[i].x+=sp[i].dx;
          sp[i].y+=sp[i].dy;
          if (sp[i].y>cHeight)
            sp[i].dy*=-0.5;
          ctx.lineTo(sp[i].x,sp[i].y);
          ctx.stroke();
          sp[i].ttl--;
        }else{
          fw.offset=i;
        }
      }
      fw.x+=fw.dx;
      fw.dy-=0.3;
      fw.y-=fw.dy;
      fw.ttl--;
      if (fw.ttl==17&&firework)
        firework(fw.x,fw.y,0);
    };
  }
  
  function FireworkShower(x,y,ttl,lvl,col,count){
    this.x=x;
    this.y=y;
    this.ttl=ttl+20;
    this.lvl=lvl;
    this.col=col;
    this.showerInfo=[];
    while (count--){
      var ttl2=Math.random()*ttl*0.3+ttl*0.7-10,
          ang=Math.random()*Math.PI*2,
          speed=Math.random()*8+2;
      this.showerInfo.push({
        x:0,
        y:0,
        dx:Math.cos(ang)*speed,
        dy:Math.sin(ang)*speed,
        branch:false,
        ttl:ttl2,
        origTTL:ttl2
      });
    }
    for (var i=0;i<2;i++){
      while (true){
        var rand=Math.floor(Math.random()*this.showerInfo.length);
        if (!this.showerInfo[rand].branch){
          this.showerInfo[rand].branch=true;
          break;
        }
      }
    }

    this.paint=function(){
      this.ttl--;
      if (this.ttl<10)
        return;
      var fw=this,
          si=fw.showerInfo;
      for (var i=0;i<si.length;i++){
        var sii=si[i],
            fracTTL=sii.ttl/sii.origTTL;
        if (sii.ttl>0){
          if (Math.random()>0.6)
            continue;
          ctx.strokeStyle=Math.random()>0.9?fw.col.light:fw.col.normal; 
          ctx.lineWidth=3*fracTTL*fracTTL;
          ctx.beginPath();
          ctx.moveTo(fw.x+sii.x,fw.y+sii.y);
          sii.x+=sii.dx;
          sii.dy+=0.2;
          sii.y+=sii.dy;
          if (fw.y+sii.y>window.innerHeight)
            sii.dy*=-0.5;
          ctx.lineTo(fw.x+sii.x,fw.y+sii.y);
          ctx.stroke();
          sii.ttl--;
        }

        if (fw.lvl>0&&sii.branch&&fracTTL<0.5){
          addFireworkShower(fw.x+sii.x,fw.y+sii.y,fw.lvl-1,fw);
          sii.branch=false;
        }
      }
    };
  }
  
  function Spinner(x,y,ttl,col,count){
    this.x=x;
    this.y=y;
    this.ttl=ttl+20;
    this.col=col;
    this.spinnerInfo=[];
    this.angle=0;
    
    this.addStream=function(offs){
      var count=5;
      while (count--){
        var ttl2=20,
            ang=this.angle+offs+Math.random()*0.25-0.125,
            speed=Math.random()*8+2;
        this.spinnerInfo.push({
          x:0,
          y:0,
          dx:Math.cos(ang)*speed,
          dy:Math.sin(ang)*speed,
          branch:false,
          ttl:ttl2,
          origTTL:ttl2
        });
      }
    };

    this.paint=function(){
      if (this.ttl>20){
        this.addStream(0);
        this.addStream(Math.PI);
      }
      this.angle+=0.3;
      var fw=this,
          si=fw.spinnerInfo;
      for (var i=0;i<si.length;i++){
        var sii=si[i],
            fracTTL=sii.ttl/sii.origTTL;
        if (sii.ttl>0){
          ctx.strokeStyle=Math.random()>0.9?fw.col.light:fw.col.normal; 
          ctx.lineWidth=3*fracTTL*fracTTL;
          ctx.beginPath();
          ctx.moveTo(fw.x+sii.x,fw.y+sii.y);
          sii.x+=sii.dx;
          sii.dy+=0.2;
          sii.y+=sii.dy;
          if (fw.y+sii.y>window.innerHeight)
            sii.dy*=-0.5;
          ctx.lineTo(fw.x+sii.x,fw.y+sii.y);
          ctx.stroke();
          sii.ttl--;
        }
      }
      this.ttl--;
    };
  }
  
  function addFireworkShower(x,y,lvl,fw){
    var cols=colPair(fw.color),
        ttl=30,
        showers=Math.floor(Math.random()*100+300);
    fwStack.push(new FireworkShower(x,y,ttl,(lvl || 0),cols[0],showers,cols));
    setTimeout(function(){
      //fwStack.push(new FireworkShower(x,y,ttl*0.8,0,cols[1],showers,cols));
    },200);
  }
  
  function colPair(id){
    var chroma=Math.round((360/32)*id);
    return [
      {
        normal: "hsl("+chroma+", 100%, 60%)",
        light: "hsl("+chroma+", 100%, 80%)"
      },{
        normal: "hsl("+(chroma+10)%360+", 100%, 60%)",
        light: "hsl("+(chroma+10)%360+", 100%, 80%)"
      }
    ]
  }
  
  function animFireworks(){
    for (var i=0;i<fwStack.length;i++){
      if (!Array.isArray(fwStack[i]))
        fwStack[i].paint();
      if (fwStack[i].ttl<0){
        fwStack.splice(i,1);
        i--;
      }
    }
    ctx.fillStyle="rgba(0,0,0,0.15)";
    ctx.fillRect(0,0,canv.width,canv.height);
  }
}

function play(){
  setEditMode("play");
  setTimeout(function(){
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canv.width,canv.height);
    engine.play();
    queue.restart();
  },1);
}

function pause(){
  setEditMode("cursor");
  engine.pause();
}

function getHSL(id){
  return "hsl("+Math.round((360/32)*id)+", 80%, 50%)";
}

function getHSLA(id,luma,opacity){
  return "hsla("+Math.round((360/32)*id)+", 80%, "+condSet(luma,50)+"%, "+condSet(opacity,1)+")";
}

function condSet(val,fallback){
  if (val!==undefined&&val!==null&&val!=="")
    return val;
  return fallback;
}

function init(){
  var fi=document.getElementsByClassName("fw-item");
  for (var i=0;i<fi.length;i++){
    (function(id){
      fi[id].onclick=function(){
        toggleFWMode(id);
      };
    })(i);
  }
  
  var cb=document.getElementById("color-box");
  for (var i=0;i<30;i++){
    (function(id){
      var cc=document.createElement("div");
      cc.className="color-circle";
      cc.style.background=getHSL(id);
      cb.appendChild(cc);
      cc.onclick=function(){
        activeFW.color=id;
        setInfoPill();
        paintSet();
        toggleColSel();
      };
    })(i);
  }
  
  var inp=document.getElementsByClassName("dur-inp");
  inp[0].onchange=function(){
    var val=parseInt(condSet(this.value,period.start)) || period.start;
    period.start=Math.round(Math.min(Math.max(val,0),period.end-1)*10)/10;
    this.value=period.start.toFixed(1);
    paintPeriod();
  };
  inp[1].onchange=function(){
    var val=parseInt(condSet(this.value,period.end)) || period.end;
    period.end=Math.round(Math.min(Math.max(val,period.start+1),500)*10)/10;
    this.value=period.end.toFixed(1);
    paintPeriod();
  };
  
  function startSlide(){
    setEditMode("slide",true);
  }
  
  var slider=document.getElementById("slider-runner-blob");
  slider.addEventListener("mousedown",startSlide);
  slider.addEventListener("touchdown",startSlide);
  
  var sb=document.getElementsByClassName("step-btn");
  sb[0].onclick=function(){
    time-=timeStep;
    setTimeElems();
  };
  sb[1].onclick=function(){
    time+=timeStep;
    setTimeElems();
  };
  document.getElementById("slider").onclick=dragSlider;
  
  body.addEventListener("mousedown",down);
  body.addEventListener("touchdown",down);
  body.addEventListener("mousemove",move);
  body.addEventListener("touchemove",move);
  body.addEventListener("mouseup",up);
  body.addEventListener("touchend",up);
  body.addEventListener("keydown",globalKeys);
  
  window.onresize=resize;
  
  setTimeElems();
}

function resize(){
  var svg=document.getElementById("grid");
  cHeight=window.innerHeight-80;
  canv.width=window.innerWidth;
  canv.height=cHeight;
  svg.setAttribute("width",window.innerWidth);
  svg.setAttribute("height",cHeight);
  paintSet();
  paintIcons();
}

if (!Math.hypot){
  Math.hypot=function(a,b){
    return Math.sqrt(a*a+b*b);
  };
}

function setThatMFingGrid(){
  setTimeout(resize,1);
  setTimeout(resize,10);
  setTimeout(resize,50);
}

init();
//Think this has to do with flexbox not kicking in in a timely fashion.
setThatMFingGrid();