npx playwright test tests/test-2.spec.ts --headed #如果想要显示浏览器的话就加headed, 默认是headless
python book_tennis.py 0 first    # 候选第1天，第一个时间段
python book_tennis.py 1 medium   # 候选第2天，中间时间段
python book_tennis.py 2 back     # 候选第3天，最后一个时间段


# 今天/明天的 06:59:00 触发
python run_concurrent.py 06:59:59
python run_concurrent.py now #立刻

# 真的要预约的话
python run_concurrent.py 06:59 tests/tennis_demo_jiangwan.spec.ts
python run_concurrent.py now tests/tennis_demo_jiangwan.spec.ts 


# 取消预约 demo
npx playwright test tests/cancel_dry.spec.ts --headed

# python调用列出已经预定的部分
python list_reservations.py

# 取消预约 demo，提前指定的时间
python cancel_scheduler.py 1h

# 每隔 5 分钟检查一次，提前 20 秒取消：
python cancel_scheduler_loop.py 20s 5m