为什么会出现 async (c) 的类型错误？
核心原因有两类，都是由 OpenAPIHono 的强类型约束触发的：
因为响应状态码不精确
router.openapi(routeConfig, handler) 会把 handler 的返回类型推断为路由配置里“成功响应”的精确类型，例如必须是 TypedResponse<..., 200, "json">。
之前很多处理函数用 return c.json({...})，没有显式传入状态码，TypeScript 会把返回值的 _status 推断为一个更宽的联合（甚至会被 throw 的 HTTPException 影响成 400 | 401 | 403 | 404 | 500 | 200 的联合），与路由要求的“只能是 200”不匹配，于是报错。
同理，POST /create 这类声明了 201 的，也必须 c.json(..., 201)。
因为响应/参数的结构与 Schema 不完全一致
比如路由声明了 PaginatedResponseSchema，但处理函数返回了 { logs, pagination }，而不是 { data: { items, total, page, pageSize, totalPages } } 的标准结构。
又如任务日志的状态枚举，OpenAPI 定义的是 success | error | running，但代码返回了 SUCCESS | FAILED | RUNNING，枚举值不一致，类型不对。
还有路径参数使用了 z.string().pipe(z.coerce.number()) 这类写法，在 @hono/zod-openapi 的类型系统下会变成难以匹配的 ZodPipe<...>，导致 params 的入参/出参签名不匹配。
我做了哪些修改来消除这些错误？
固定成功状态码
所有成功分支统一使用与路由声明一致的状态码，比如 c.json(payload, 200)、创建时 c.json(payload, 201)，从而让返回类型精确为 200 或 201，不再是“多状态联合”。
让返回体与声明的 Schema 严格一致
任务、数据、项目、分组等路由：把返回结构整理成文档里定义的字段名与层级（如分页统一 { data: { items, total, page, pageSize, totalPages } }）。
对返回字段做类型规范化：时间转 ISO 字符串、可空值转 null、数值 Number(...)、Record<string, number> 的值强制 number 化等。
枚举映射：如把内部 SUCCESS/FAILED/RUNNING 映射成 OpenAPI 定义的 success/error/running。
修正路径参数的 Zod 定义
把 z.string().pipe(z.coerce.number().int().positive()) 改成 z.string().transform(Number).refine(v => !isNaN(v) && v > 0, { message: '无效的ID' })，避免 ZodPipe 带来的复杂类型，直接得到 number，与 router.openapi 的 params 出参签名对齐。
仅返回 Schema 中声明的字段
例如调度器状态只返回 isRunning/totalTasks/runningTasks/lastStartTime/uptime，避免多余字段让推断类型与声明不一致。
这样一来，router.openapi 对处理函数的返回类型检查都能完全匹配路由声明的响应类型和状态码，类型系统自然不再报错。