import time
import uno

local_context = uno.getComponentContext()
resolver = local_context.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local_context)
for attempt in range(60):
    try:
        context = resolver.resolve("uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext")
        break
    except Exception:
        time.sleep(1)
else:
    raise RuntimeError("LibreOffice did not start")

services = context.ServiceManager
desktop = services.createInstanceWithContext("com.sun.star.frame.Desktop", context)
document = desktop.loadComponentFromURL("private:factory/scalc", "_blank", 0, ())
controller = document.getCurrentController()
sheet = document.Sheets.getByIndex(0)
rows = [
    ("Route", "Quantity", "Notes"),
    ("a\\|b", "7", "café 雪 😀"),
    ("**literal**", "", "Retail"),
    ("final", "0", "saved"),
]
for row_index, row in enumerate(rows):
    for column_index, value in enumerate(row):
        sheet.getCellByPosition(column_index, row_index).setString(value)
controller.select(sheet.getCellRangeByName("A1:C4"))
dispatch = services.createInstanceWithContext("com.sun.star.frame.DispatchHelper", context)
dispatch.executeDispatch(controller.getFrame(), ".uno:Copy", "", 0, ())
