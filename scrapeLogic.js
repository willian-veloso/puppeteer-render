const pup = require("puppeteer");
require("dotenv").config();

const url = "https://drcalc.net/consultaindices.asp?ml=Series&categoria=1&it=1"

const selectSelector = ['select[name="imes"]','select[name="iano"]', 'select[name="codigo"]']
const optionValue = ['01','1930'];
const cellSelector = 'td.tabindmenu2';

async function selecionarOpcao(page, selectSelector, optionValue) {
    await page.evaluate((selectSelector, optionValue) => {
      const select = document.querySelector(selectSelector);
      const option = [...select.options].find(opt => opt.value === optionValue);

      if (option) {
        option.selected = true;
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
      } else {
        console.error('Opção não encontrada:', optionValue);
      }
    }, selectSelector, optionValue);
  }

async function obterDadosDaTabela(page, cellSelector) {
return page.$$eval(cellSelector, (cells) => {
    if (cells.length === 0) {
    console.error('Nenhuma célula encontrada');
    return null;
    }

    const tabela = cells[0].closest('table');
    const linhas = tabela.querySelectorAll('tr');

    const dados = [];
    linhas.forEach((linha) => {
    const celulas = linha.querySelectorAll('td');
    const linhaData = Array.from(celulas).map(celula => celula.textContent.trim());
    dados.push(linhaData);
    });

    return dados;
});
}

const scrapeLogic = async (res) => {
    // Launch the browser and open a new blank page
  const browser = await pup.launch({
    args: [
        "--disable-setupid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
    ],
    executablePath:
    process.env.NODE_ENV === "production"
     ? process.env.PUPPETEER_EXECUTABLE_PATH
     : puppeteer.executablePath(),
  });
  try{
    const page = await browser.newPage();

    await page.goto(url);
    
    await page.waitForSelector('select[name="imes"]');

    await selecionarOpcao(page, selectSelector[0], optionValue[0]);
    await selecionarOpcao(page, selectSelector[1], optionValue[1]);
    await page.select(selectSelector[2], '33')

    await Promise.all([
        page.waitForNavigation(),
        page.click('input[name="submit1"]')
    ]);

    await page.waitForSelector('td.tabindmenu2');

    const tableData = await obterDadosDaTabela(page, cellSelector);

    console.log(tableData);
    res.send(tableData);
    
} catch (e) {
        console.error(e);
        res.send(`Something went wrong while running Puppeteer: ${e}`)
    } finally {
        await browser.close();
    }
};

module.exports= { scrapeLogic };