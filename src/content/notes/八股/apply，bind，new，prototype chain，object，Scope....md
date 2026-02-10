---
description: ""
date: 2025-12-08T21:06
toc_max_heading_level: 4
---
## this/bind/apply

this默认是函数的调用者，通过A.B()调用，this是A，没有.直接调用B()那么this就是全局对象

手动改变一个函数默认的this，
就是改变函数的调用者，
就要用指定的对象调用这个函数
指定的对象调用函数，
必须要让这个对象中有这个函数，所以要创建一个函数属性
这个函数从哪来？现在还没改变的默认的this，就是 改变this函数的调用者，就是这个函数

于是，我们得到了使用新的this，调用函数的能力，这就是apply

当我们有了apply，意味着我们有了使用新的this，调用函数的结果（就是apply return的内容）

只要包装一个函数，让传入参数，和返回结果都符合，使用新的this调用的行为，
返回这个函数，我们就有了bind

---
## prototype chain

JavaScript如何不通过类来解决数据的共享和私有？

- 万物皆对象
- 所有对象都有prototype属性，都可以视作被Function obj创建的instance obj
	- 所有对象都有`__proto__`（或 `[[Prototype]]`）指向这个 prototype obj
	- 任何对象的都能够共享访问到`__proto__`（或 `[[Prototype]]`）链上的首层key
	- 本质是通过指针指向其原型，让原型充当类，可以直接访问一些共有的方法

- 逻辑上对象分为函数对象和普通对象
- 函数对象声明时会创建prototype属性，也会创建prototype obj
	- 函数对象通过prototype属性访问他创建的prototype obj
	- 普通对象通过`__proto__`访问创建他的prototype obj
	- 函数对象也是普通对象，通过`__proto__`访问创建他的prototype obj，默认是`Obect.prototype`
- 普通对象分prototype obj和instance obj
	- prototype obj至少有这两个属性：
		- constructor，它应该始终指向 prototype 对应的声明函数
	- prototype obj是被函数对象声明（创建）时创建的对象
	- prototype obj不被构造函数创建，他的prototype是Object.prototype
	- instance obj是被函数对象对象调用时创建的对象，他的prototype obj是constructor.prototype

- 逻辑上，我们可以认为instance obj继承自prototype obj，一切是源于一个function obj,我们可以认为他是constructor
- 这样我们就能够认为prototype chain实现了类相似的功能，解决了数据的共享问题

一个原型对象，往往有子实例和构造函数两个对象与他链接

| 层级                | 关系            | 建立方式                                    |
| ----------------- | ------------- | --------------------------------------- |
| **实例 → 原型对象**     | 通过 `new` 自动建立 | `obj.__proto__ = Constructor.prototype` |
| **原型对象 → 父类原型对象** | 通过显式代码建立      | 需要开发者自己写                                |

![](assets/apply，bind，new，prototype%20chain，object，Scope/file-20260210115331922.png)

---
## new

使用new调用的Function称为constructor

单纯的function可以对this做任意定义

new的行为是，让function成为constructor，constructor的定义是能返回一个对象，且能使用function的原型对象function.prototype的任意属性方法的对象

原型链中已知的事实：
- 任何函数声明的同时会创建一个原型对象`Function/Constructor.prototype`继承自`Obect.prototype`
- 对象访问到原型对象的方法是`obj.__proto__`，直接创建的`{}`的`__proto__`，默认指向`Obect.prototype`
- 函数访问到原型对象的方法是`constructor.prototype`
- `obj.__proto__ === constructor.prototype`都为原型对象

那么就是这几步
1. 为了返回对象，必须要创建对象obj
2. 为了让对象访问function.prototype的任意属性方法，对象要能访问原型对象`function.prototype`，那么就要修改默认的`obj.__proto__`指向的`Obect.prototype`到`function.prototype`
3. 让obj作为this执行function，因为function是未知的，可能对this进行初始化，也可能自己已经承担了function的责任进行返回obj
4. 判断function是否返回，如果没返回对象，那么这个constructor必须返回一个obj，也就是我们最初创建的obj

---

## 继承

在 JavaScript 中，继承分两层：

| 层级                | 关系            | 建立方式                                    |
| ----------------- | ------------- | --------------------------------------- |
| **实例 → 原型对象**     | 通过 `new` 自动建立 | `obj.__proto__ = Constructor.prototype` |
| **原型对象 → 父类原型对象** | 通过显式代码建立      | 需要开发者自己写                                |

实现继承：
也就是说实现**原型对象 → 父类原型对象**的继承

1. 创建**父类（Parent）** 定义一些属性和方法。
2. 创建**子类（Child）** 希望能直接使用这些属性和方法，而不用重新写一遍。
3. 让子类实例共享父类的属性和方法。

在JS中类就是原型对象，而原型对象的创建是通过函数的声明
- 任何函数声明的同时会创建一个原型对象`Function/Constructor.prototype`继承自`Obect.prototype`
- 任何prototype对象 本身至少有两个属性
	- constructor，它应该始终指向 prototype 对应的声明函数
	- `__proto__`，之前说了这是对象用于访问prototype的属性，而prototype本身也是对象，所以这是用来访问prototype自身的prototype的属性，默认就是`Obect.prototype`
- 所以创建类，就是声明构造函数，定义属性和初始值
- 而类的另一个构成是方法，给类添加方法，就是给原型对象添加方法
	- 动态语言对象中直接给没声明的属性赋值，就能为对象添加属性
- 子类可以以相同的方式创建，建立继承关系，就是希望子类构造函数得出的实例可以使用父类的方法和属性
- 原型链中已知的事实：
	- prototype没有的方法会利用`__proto__`从上级prototype继续寻找
	- prototype原型对象中不会有任何属性，除非显式写入，属性是在实例中的
- trick：
	- 直接改`Child.prototype.__proto__` = Parent.prototype，只能共享方法，一些constructor创建的属性不在prototype中，是访问不到的，只在实例中存在
- 为了实现方法和属性的的共同继承，方式如下：

- 符合直觉的做法：
	- 在子类构造函数内调用父类的constructor（别忘了绑定this），实现属性继承
	- `Child.prototype.__proto__ = Parent.prototype;`，实现方法继承
	- 上述似乎是最符合原型链想法的做法，但是`__proto__`在ES6前是非标准做法， 但是ES6考虑性能问题，其语法糖class的实现也不是这种做法


- 寄生组合式做法：
	- Object.create(o)，创建一个空的对象，继承自传入的对象，可以访问传入对象的所有方法，效果相当于创建了一个newObj，然后`newObj.__proto__ = o;`
	- 不让直接改`__proto__`的情况下，我们可以让对象初始化的`__proto__`就符合预期，只接从对象层面赋值，而不是修改对象的属性
	- 我们可以使用Object.create(o)，创建一个中间对象，把他直接赋值`Child.prototype = Object.create(Parent)`，可以达到同样的效果，共享方法
	- 直接修改`__proto__`的做法是直接修改原本prototype的指向，而这种做法是创建一个我们想要的prototype，再整个赋值给`Child.prototype`，这其实也就是new和Object.create的区别
	- 还有一个微妙的不同，prototype原型对象都是自带两个属性的，一个是`__proto__`，还有一个是`constructor`，直接修改constructor自然是正确的，但是如果是对象赋值的话，中间对象的`constructor`属性需修正为Child，让效果和直接修改等价

---

## object & copy

原始数据类型：
ES5: number、string、boolean、undefined、null
ES6 & ES6+: Symbol、BigInt

引用数据类型：
除了原始类型剩下全是引用类型，而且他们都继承于 Object；在内存处理上，原始类型直接存储于栈内存，而引用类型是存了一个指针在栈里，实际的数据存在堆内存

如何复制对象，
创建一个新的对象直接赋值对于引用对象不可行， 
因为赋值的行为是在栈中操作变量，而引用对象内容存储在堆中，在栈中只是指针

浅拷贝是创建对象，遍历一层原对象，依个属性创建新的相同值的内容，这样第一层的行为是正确的，但是更深的嵌套依然会有公共修改的问题

现有的浅拷贝方法有
```
let objB = { ...objA };
Object.assign({}, objA)
```


- JSON.parse(Json.stringfy(obj))是对于很多对象简单的深拷贝方法，但是对于一些对象也不适用
- 针对可序列化的对象，`structuredClone(value)`。

深拷贝的实现需要递归检查是否有嵌套层，对于每一层的属性都创建再赋值，对于特殊的数据类型做特殊处理

- 递归条件结束是对象为空，或者不是对象类型（基本类型），就直接返回对象
- 遇到 JSON 处理不了的数据结构，例如正则对象，这个就得识别它的类型单独再做引用其构造函数，创建副本，进行return（这类对象不可能还会往下嵌套）
- 遇到循环引用这种情况，可以预先做好内部所有键的指针的记录，比如可以用 WeakSet 或者 WeakMap，因为这两个数据结构是「使用指针作为键」的 Set 和 Map
- 正常逻辑就是和浅拷贝一样，区别在于不是直接给属性赋值，而是给他赋值deepclone属性值的返回值

## Variable, Scope, Closure

除了函数定义的大括号都是块级作用域
垃圾回收只会处理函数作用域
块级作用域变量不是局部变量，也是整个作用域共享的


var 是 ES5 声明变量的唯一方法，let 是 ES6 出的用于替代 var 的方法，建议是不用 const 的时候全用 let，而 const 则是声明常量的意思，不过这三个关键字都有一些可以问的问题

- var 声明的变量会被挂在作用域的根对象上，比如在最外层 var 一个变量就会挂到 window 上，而 let 不会。
- 至于 const 只会问一个比较重要的问题，就是 const 声明的引用类型是否可变——最外侧的指针不可变，但是内部随便变
- var 声明的变量会被挂在作用域的根对象上，比如在最外层 var 一个变量就会挂到 window 上，而 let 不会是块级局部的。

```js
const [state, setState] = useState({a: 1, b: 2})
state.b = 3
setState(state) // 这样是不会生效的，不会重新渲染，因为 state 指针没变
setState({...state}) // 这样就会生效，因为创建了一个新对象，指针变了
```

变量提升与暂时性死区

```JavaScript
console.log(a) // a is not defined 这里会报错
```

```JavaScript
console.log(a) // 输出 undefined，没有报错
var a = 1 // a 的定义被提升了
console.log(a) // 1
```

```JavaScript
console.log(a) // 会报错，这里被称为 a 的暂时性死区
let a = 1 // a 的定义被提升了
```

```js
var a = 'apple';
function fighting() {
    console.log(a); //--·undefined，
	// 局部作用域内var会声明提升所以不会往上寻找外部的a
    var a = 'angel';
    console.log(a);// --·'angel'
}
fighting();
```

其中 var 语法的顺序等价为以下写法

```JavaScript
var a
console.log(a) // undefined
a = 1
```

额外解构语法其实本身并不复杂，只是将等号右边的元素与等号左边的元素进行索引的对齐，并且赋值

其实就是一个用展开可迭代对象的一个快捷语法，这里只写一两个技巧，比如剔除某元素，或者覆盖某元素。

```JavaScript
const {age, ...others} = {...props} // 得到的是 age 和除了 age 之外的 props
```

```JavaScript
<Component {...props, key: myKey} /> // 先解构，再覆盖
```




## function

arguments 指的是 Function 的运行时上下文中的一个内置对象，存储了一个函数被调用时传递的所有参数，这个参数数量可能超过了本来需要的数量。

>注意点：'use strict' 不让用；arguments 是个类数组；箭头函数没有这个内置对象

理论上是箭头函数依赖外侧环境的运行时上下文，this 的话也是用外侧的，不过实际处理起来可能更棘手，所以既然箭头函数很多，还是少用 this

| 运算符   | 名称                        | 是否进行类型转换   | 示例                    |
| ----- | ------------------------- | ---------- | --------------------- |
| `==`  | **宽松相等（loose equality）**  | ✅ 会进行类型转换  | `'1' == 1` → `true`   |
| `===` | **严格相等（strict equality）** | ❌ 不会进行类型转换 | `'1' === 1` → `false` |

箭头函数更接近于其他语言中“**lambda 表达式**”或“**匿名函数**”，  
是轻量级、无上下文绑定的函数值。
**箭头函数 ≈ “纯函数”**，只有输入（参数）和输出（返回值），  
没有原型、没有自己的 `this`、没有 `arguments`、不能当构造函数。

柯里化（**Currying**）是函数式编程中非常重要的概念。

> **柯里化**是把一个多参数函数，转化为一系列只接收单一参数的函数。
> 简单说：
> 原本一次性接收所有参数 → 改成 **“分步接收”**。



## JS Data Structure

Array.prototype.sort() 方法与实现机制
你以为是快排，其实比快排恶心多了～
length < 40 用的应该是冒泡排序；
length < 200 用的是快排；
length >= 200 用的是堆排；

String 最常用的 slice、splice，Array 的 join 也能算是 string 方法吧
Array 说过了
Math 不想多说，因为 floor、round、random、abs 除了这些常用的，还有不少真的数学运算才会用到的，然而哪个人拿 JS 做高性能的数学运算啊。

String 和 Array 的 slice 最常用于创建一个副本，而且 slice 的第一个参数支持负索引
Splice 尽量不要再遍历的时候用，因为它会改变元素长度使遍历变得不可预知。
String 的一些高级处理其实更倾向于正则表达式，所以切字符串能会就会吧，不会用模版字符串和正则也一样。


Proxy
好比说 Promise 是专门盯着一个「函数」的观察者，那么 Proxy 就是专门盯着一个「对象」的观察者，虽然观察对象的观察者应该叫「代理器」
Proxy 接收一个 target 对象，和一个具体要监控什么事件的设置对象，返回一个和 target 一模一样但是被监控了的对象，每当被监控的 target 触发了监控的事件，proxy 就能够捕获并且执行编写者分发给他的函数。
Proxy 支持的触发器有：
- get、set
- definePropoty、delete
- etc... 基本凡是能对对象进行的操作都可以监控
使用时要注意，Proxy 是返回了一个被监控的 target，改变这个 target 是可以同步改变源 target 并且触发触发器的；但是如果这个时候你去改源 target，是不会触发触发器的，也不会改变被监控的那个 target。因此处于 proxy 的语义，在一个对象被 proxy 代理后，就应该只用 proxy 返回的对象，而不是原对象，以免语义混乱。
41(3-). Reflect 对象
简化 Proxy 语法的，没啥可说的，看看 MDN

## Event Loop、Promise、Async/Await


## browser

DOM常见的操作方式
- document.querySelector 这个方法支持绝大多数的 CSS 选择器
- document.getElementById 或者 document.getElementsByClassName
- document.remove
- document.append
- document.createElement
- etc...

addEventListener 和 onClick() 的区别

这不是一个很有营养的问题，因为在我看来这就是同一个 API 的不同设计，你只需要知道：

- addEventListener 是「添加一个事件」如果不用了要手动 remove 掉，也就是增加。
- 直接设置 onClick 是相当于清空当前所有的事件，再添加一个 click 事件，也就是覆盖。