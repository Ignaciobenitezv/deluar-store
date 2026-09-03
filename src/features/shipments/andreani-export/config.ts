import path from "node:path";

export const ANDREANI_TEMPLATE_FILE_NAME = "EnvioMasivoExcelPaquetes.xlsx";
export const ANDREANI_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "andreani",
  ANDREANI_TEMPLATE_FILE_NAME,
);

export const ANDREANI_HOME_DELIVERY_SHEET = "A domicilio";
export const ANDREANI_BRANCH_SHEET = "A sucursal";
export const ANDREANI_CONFIG_SHEET = "Configuracion";

export const ANDREANI_MAX_DATA_ROWS = 497;

